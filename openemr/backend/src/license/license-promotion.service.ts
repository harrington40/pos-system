import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { LicenseTier } from './license-key';
import { TIER_CODES } from './license-key';
import type { LicensePromotion } from './license.service';

/** A promotion as stored, including whether it is currently running. */
export interface StoredPromotion extends LicensePromotion {
    active: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
}

/**
 * The sales promotion shown on the pricing page, stored so the marketing console
 * can start and stop one without an operator editing the environment and
 * restarting the backend.
 *
 * Kept apart from LicenseService on purpose: promotions are marketing config,
 * while that service owns key crypto. Mixing them would drag a DataSource into
 * the offline key tool, which only ever needs the signing secret.
 *
 * Precedence is deliberate and simple. A row here wins outright: if it exists but
 * is switched off there is no promotion - it does not silently fall back to the
 * environment, or the off switch would look broken. Only installs that have never
 * used the console fall back to LICENSE_PROMOTION.
 */
@Injectable()
export class LicensePromotionService implements OnModuleInit {
    private readonly logger = new Logger(LicensePromotionService.name);

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async onModuleInit(): Promise<void> {
        try {
            await this.dataSource.query(
                `CREATE TABLE IF NOT EXISTS license_promotions (
                   id int NOT NULL AUTO_INCREMENT,
                   label varchar(120) NOT NULL DEFAULT 'Special offer',
                   percent_off int NOT NULL,
                   tiers varchar(120) NOT NULL DEFAULT '',
                   cycle varchar(10) NOT NULL DEFAULT 'both',
                   ends_at datetime NULL,
                   code varchar(40) NULL,
                   note varchar(255) NULL,
                   active tinyint(1) NOT NULL DEFAULT 0,
                   updated_by varchar(120) NULL,
                   updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                   PRIMARY KEY (id)
                 )`,
            );
        } catch (e) {
            // A missing table must not stop the app booting; the pricing page
            // then simply falls back to the environment.
            this.logger.error(
                `Could not create license_promotions: ${(e as Error).message}`,
            );
        }
    }

    private map(row: any): StoredPromotion {
        const tiers = String(row.tiers || '')
            .split(',')
            .map((t) => t.trim())
            .filter((t) => !!TIER_CODES[t as LicenseTier]) as LicenseTier[];
        return {
            label: row.label || 'Special offer',
            percentOff: Number(row.percent_off),
            tiers: tiers.length ? tiers : (Object.keys(TIER_CODES) as LicenseTier[]),
            cycle:
                row.cycle === 'monthly' || row.cycle === 'yearly'
                    ? row.cycle
                    : 'both',
            endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
            code: row.code || null,
            note: row.note || null,
            active: Number(row.active) === 1,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
            updatedBy: row.updated_by || null,
        };
    }

    /** The stored row, running or not, for the console. */
    async getRecord(): Promise<StoredPromotion | null> {
        try {
            const rows = await this.dataSource.query(
                'SELECT * FROM license_promotions ORDER BY id DESC LIMIT 1',
            );
            return rows.length ? this.map(rows[0]) : null;
        } catch {
            return null;
        }
    }

    /**
     * What the pricing page should show, or null. A stored row that is switched
     * off, or whose end date has passed, means no promotion at all.
     */
    async getEffective(): Promise<LicensePromotion | null> {
        const record = await this.getRecord();
        if (!record) return null;
        if (!record.active) return null;
        if (record.endsAt && new Date(record.endsAt).getTime() < Date.now()) {
            return null;
        }
        return {
            label: record.label,
            percentOff: record.percentOff,
            tiers: record.tiers,
            cycle: record.cycle,
            endsAt: record.endsAt,
            code: record.code,
            note: record.note,
        };
    }

    /**
     * Validate an operator's input.
     *
     * Stricter than the environment parser on purpose: the console is used by
     * someone who can read the error, so a bad percentage should be refused
     * loudly rather than silently ignored.
     */
    private validate(input: Partial<LicensePromotion>) {
        const percentOff = Number(input.percentOff);
        if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 99) {
            throw new BadRequestException('percentOff must be between 1 and 99');
        }

        const tiers = Array.isArray(input.tiers)
            ? input.tiers.filter((t) => !!TIER_CODES[t as LicenseTier])
            : [];
        if (Array.isArray(input.tiers) && input.tiers.length && !tiers.length) {
            throw new BadRequestException(
                `tiers must be any of: ${Object.keys(TIER_CODES).join(', ')}`,
            );
        }

        let endsAt: Date | null = null;
        if (input.endsAt) {
            const parsed = new Date(String(input.endsAt));
            if (isNaN(parsed.getTime())) {
                throw new BadRequestException('endsAt is not a valid date');
            }
            endsAt = parsed;
        }

        const cycle =
            input.cycle === 'monthly' || input.cycle === 'yearly'
                ? input.cycle
                : 'both';

        return {
            label: (input.label ? String(input.label) : 'Special offer').slice(0, 120),
            percentOff,
            tiers: tiers.join(','),
            cycle,
            endsAt,
            code: input.code ? String(input.code).slice(0, 40) : null,
            note: input.note ? String(input.note).slice(0, 255) : null,
        };
    }

    /** Create or replace the single promotion row. Never activates it. */
    async save(
        input: Partial<LicensePromotion>,
        actor: string,
    ): Promise<StoredPromotion | null> {
        const value = this.validate(input);
        const existing = await this.getRecord();
        const params = [
            value.label,
            value.percentOff,
            value.tiers,
            value.cycle,
            value.endsAt,
            value.code,
            value.note,
            actor,
        ];

        if (existing) {
            await this.dataSource.query(
                `UPDATE license_promotions
                    SET label = ?, percent_off = ?, tiers = ?, cycle = ?, ends_at = ?,
                        code = ?, note = ?, updated_by = ?
                  WHERE id = (SELECT id FROM (SELECT id FROM license_promotions ORDER BY id DESC LIMIT 1) AS t)`,
                params,
            );
        } else {
            await this.dataSource.query(
                `INSERT INTO license_promotions
                   (label, percent_off, tiers, cycle, ends_at, code, note, active, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                params,
            );
        }
        this.logger.log(`Promotion saved by ${actor}: ${value.label} ${value.percentOff}%`);
        return this.getRecord();
    }

    /** Start or stop the promotion - the console's switch. */
    async setActive(active: boolean, actor: string): Promise<StoredPromotion | null> {
        const existing = await this.getRecord();
        if (!existing) {
            throw new BadRequestException('No promotion has been configured yet');
        }
        await this.dataSource.query(
            `UPDATE license_promotions SET active = ?, updated_by = ?
              WHERE id = (SELECT id FROM (SELECT id FROM license_promotions ORDER BY id DESC LIMIT 1) AS t)`,
            [active ? 1 : 0, actor],
        );
        this.logger.log(`Promotion ${active ? 'ACTIVATED' : 'DEACTIVATED'} by ${actor}`);
        return this.getRecord();
    }
}

