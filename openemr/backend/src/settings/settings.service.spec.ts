import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * The admin feature-flag store. What matters: defaults are seeded, persisted
 * values win, values are coerced to real booleans, and unknown keys are refused
 * so a stray request cannot invent settings.
 */
describe('SettingsService', () => {
    /** In-memory stand-in for the `app_settings` table. */
    function build() {
        const stored: Record<string, string> = {};
        const calls: { sql: string; params?: unknown[] }[] = [];

        const dataSource = {
            query(sql: string, params?: unknown[]) {
                calls.push({ sql, params });
                if (sql.includes('INSERT IGNORE INTO app_settings')) {
                    const [key, value] = params as [string, string];
                    if (!(key in stored)) stored[key] = value;
                    return Promise.resolve({});
                }
                if (sql.includes('INSERT INTO app_settings')) {
                    const [key, value] = params as [string, string];
                    stored[key] = value;
                    return Promise.resolve({});
                }
                if (sql.includes('FROM app_settings')) {
                    return Promise.resolve(
                        Object.entries(stored).map(([setting_key, setting_value]) => ({
                            setting_key,
                            setting_value,
                        })),
                    );
                }
                return Promise.resolve([]);
            },
        };
        return { dataSource, calls, stored };
    }

    async function service(dataSource: unknown) {
        const module = await Test.createTestingModule({
            providers: [
                SettingsService,
                { provide: getDataSourceToken(), useValue: dataSource },
            ],
        }).compile();
        return module.get(SettingsService);
    }

    it('creates the table and seeds the documented default', async () => {
        const { dataSource, calls } = build();
        const svc = await service(dataSource);

        await svc.onModuleInit();

        expect(
            calls.some((c) => c.sql.includes('CREATE TABLE IF NOT EXISTS app_settings')),
        ).toBe(true);
        const seed = calls.find((c) => c.sql.includes('INSERT IGNORE INTO app_settings'));
        expect(seed?.params).toEqual(['video_consultation_enabled', 'true']);
    });

    it('defaults video consultations to enabled', async () => {
        const { dataSource } = build();
        const svc = await service(dataSource);

        expect(await svc.getPublic()).toEqual({ video_consultation_enabled: true });
        expect(await svc.isEnabled('video_consultation_enabled')).toBe(true);
    });

    it('reflects a persisted override, coerced to a boolean', async () => {
        const { dataSource, stored } = build();
        stored.video_consultation_enabled = 'false';
        const svc = await service(dataSource);

        expect(await svc.getPublic()).toEqual({ video_consultation_enabled: false });
        expect(await svc.isEnabled('video_consultation_enabled')).toBe(false);
    });

    it('saves and returns the new value', async () => {
        const { dataSource, calls } = build();
        const svc = await service(dataSource);

        const items = await svc.update({ video_consultation_enabled: false });

        expect(items).toEqual([
            expect.objectContaining({ key: 'video_consultation_enabled', value: false }),
        ]);
        const upsert = calls.find((c) => c.sql.includes('INSERT INTO app_settings'));
        expect(upsert?.params).toEqual(['video_consultation_enabled', 'false']);
        expect(await svc.isEnabled('video_consultation_enabled')).toBe(false);
    });

    it('treats a string "true" from a form post as enabled', async () => {
        const { dataSource } = build();
        const svc = await service(dataSource);

        await svc.update({ video_consultation_enabled: 'true' });
        expect(await svc.isEnabled('video_consultation_enabled')).toBe(true);

        await svc.update({ video_consultation_enabled: 'false' });
        expect(await svc.isEnabled('video_consultation_enabled')).toBe(false);
    });

    it('refuses unknown keys so settings cannot be invented', async () => {
        const { dataSource } = build();
        const svc = await service(dataSource);

        await expect(svc.update({ made_up_flag: true })).rejects.toBeInstanceOf(
            BadRequestException,
        );
        await expect(svc.update({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports an unknown key as disabled rather than throwing', async () => {
        const { dataSource } = build();
        const svc = await service(dataSource);
        expect(await svc.isEnabled('nope')).toBe(false);
    });
});
