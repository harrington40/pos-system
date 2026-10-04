import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PatientsService } from '../patients/patients.service';
import { SettingsService } from '../settings/settings.service';

/**
 * The telehealth addition is the interesting bit: a *video* booking must mint a
 * shareable room code (so patient + physician can meet in /video/<room>) while
 * in-person bookings must stay room-less.
 *
 * The admin feature flag is enforced here too — a video request must be refused
 * outright when video consultations are switched off.
 */
describe('BookingsService video consultations', () => {
    function build(
        responder?: (sql: string) => unknown,
        videoEnabled = true,
    ) {
        const calls: { sql: string; params?: unknown[] }[] = [];
        const dataSource = {
            query(sql: string, params?: unknown[]) {
                calls.push({ sql, params });
                return Promise.resolve(responder ? responder(sql) : { insertId: 9 });
            },
        };
        const patients = { create: jest.fn() };
        const settings = {
            isEnabled: jest.fn().mockResolvedValue(videoEnabled),
        };
        return { dataSource, patients, settings, calls };
    }

    async function service(
        dataSource: unknown,
        patients: unknown,
        settings: unknown,
    ) {
        const module = await Test.createTestingModule({
            providers: [
                BookingsService,
                { provide: getDataSourceToken(), useValue: dataSource },
                { provide: PatientsService, useValue: patients },
                { provide: SettingsService, useValue: settings },
            ],
        }).compile();
        return module.get(BookingsService);
    }

    const baseDto = {
        fname: 'Ada',
        lname: 'Lovelace',
        phone_contact: '0770 000 000',
        preferred_date: '2026-05-01',
    };

    it('defaults to an in-person booking with no video room', async () => {
        const { dataSource, patients, settings, calls } = build();
        const result = await (
            await service(dataSource, patients, settings)
        ).createRequest({ ...baseDto });

        expect(result).toEqual({
            id: 9,
            status: 'pending',
            consultation_type: 'in_person',
            video_room: null,
        });
        const insert = calls.find((c) => c.sql.includes('INSERT INTO booking_requests'));
        expect(insert?.params?.[8]).toBe('in_person');
        expect(insert?.params?.[9]).toBeNull();
    });

    it('mints a shareable room code for a video booking', async () => {
        const { dataSource, patients, settings, calls } = build();
        const result = await (
            await service(dataSource, patients, settings)
        ).createRequest({
            ...baseDto,
            consultation_type: 'video',
        });

        expect(result.consultation_type).toBe('video');
        expect(result.video_room).toMatch(/^vc-[0-9a-f]{8}$/);
        const insert = calls.find((c) => c.sql.includes('INSERT INTO booking_requests'));
        expect(insert?.params?.[8]).toBe('video');
        expect(insert?.params?.[9]).toBe(result.video_room);
    });

    it('refuses a video booking when the admin flag is off', async () => {
        const { dataSource, patients, settings, calls } = build(undefined, false);
        const svc = await service(dataSource, patients, settings);

        await expect(
            svc.createRequest({ ...baseDto, consultation_type: 'video' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        // Nothing may be written when the request is refused.
        expect(
            calls.some((c) => c.sql.includes('INSERT INTO booking_requests')),
        ).toBe(false);
    });

    it('still accepts an in-person booking when the admin flag is off', async () => {
        const { dataSource, patients, settings } = build(undefined, false);
        const svc = await service(dataSource, patients, settings);

        const result = await svc.createRequest({ ...baseDto });
        expect(result.consultation_type).toBe('in_person');
    });

    it('gives two video bookings distinct rooms', async () => {
        const { dataSource, patients, settings } = build();
        const svc = await service(dataSource, patients, settings);
        const [a, b] = await Promise.all([
            svc.createRequest({ ...baseDto, consultation_type: 'video' }),
            svc.createRequest({ ...baseDto, consultation_type: 'video' }),
        ]);
        expect(a.video_room).not.toBe(b.video_room);
    });

    it('rejects a booking missing required fields', async () => {
        const { dataSource, patients, settings } = build();
        const svc = await service(dataSource, patients, settings);
        await expect(svc.createRequest({ ...baseDto, fname: '' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('adds the telehealth columns on startup without failing when they exist', async () => {
        const { dataSource, patients, settings, calls } = build((sql) =>
            sql.includes('ALTER TABLE') ? Promise.reject(new Error('duplicate column')) : undefined,
        );
        const svc = await service(dataSource, patients, settings);
        await expect(svc.onModuleInit()).resolves.toBeUndefined();
        const alters = calls.filter((c) => c.sql.includes('ALTER TABLE booking_requests'));
        expect(alters.some((a) => a.sql.includes('consultation_type'))).toBe(true);
        expect(alters.some((a) => a.sql.includes('video_room'))).toBe(true);
    });
});

