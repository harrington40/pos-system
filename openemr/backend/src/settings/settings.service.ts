import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * A single admin-configurable application setting.
 *
 * Values live in the `app_settings` table as strings; `type` drives coercion so
 * callers get real booleans rather than `'true'`.
 */
export interface SettingDefinition {
    key: string;
    label: string;
    description: string;
    /** Groups related settings in the admin UI. */
    group: string;
    type: 'boolean' | 'string';
    default: string;
    /** Exposed on the unauthenticated `/settings/public` endpoint. */
    public?: boolean;
}

/** A definition plus its current value, as returned to the admin UI. */
export interface SettingItem extends SettingDefinition {
    value: boolean | string;
}

/**
 * The registry of known settings. Anything not listed here cannot be read or
 * written, so a stray request can never create a new key.
 */
export const SETTING_DEFINITIONS: SettingDefinition[] = [
    {
        key: 'video_consultation_enabled',
        label: 'Video consultations',
        description:
            'Offer patients a secure WebRTC video visit from the public booking page. When off, the video option is hidden and video bookings are rejected.',
        group: 'consultations',
        type: 'boolean',
        default: 'true',
        public: true,
    },
    {
        key: 'registrar_billing_shared_access',
        label: 'Share registrar & billing access',
        description:
            'When on, billing users get every registrar (front desk) menu and API feature, and registrar users get every billing menu and API feature. Turn off to keep the two roles separate.',
        group: 'access',
        type: 'boolean',
        default: 'true',
    },
];

/** Coerce a stored string into the setting's declared type. */
function coerce(def: SettingDefinition, raw: unknown): boolean | string {
    if (def.type === 'boolean') {
        return raw === true || String(raw ?? '').toLowerCase() === 'true';
    }
    return String(raw ?? '');
}

@Injectable()
export class SettingsService implements OnModuleInit {
    private readonly logger = new Logger(SettingsService.name);

    /** Fallback store used when the table cannot be read (never preferred). */
    private readonly definitions = new Map(
        SETTING_DEFINITIONS.map((d) => [d.key, d]),
    );

    /**
     * Short-lived cache for hot flag lookups. The roles guard runs on every
     * authenticated request, so it cannot afford a settings query each time.
     */
    private readonly enabledCache = new Map<
        string,
        { value: boolean; expiresAt: number }
    >();

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    async onModuleInit(): Promise<void> {
        await this.ensureSchema();
    }

    private async ensureSchema(): Promise<void> {
        await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        // Seed any settings that have not been persisted yet.
        for (const def of SETTING_DEFINITIONS) {
            await this.dataSource.query(
                `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)`,
                [def.key, def.default],
            );
        }
        this.logger.log('app_settings schema ready');
    }

    /** Every known setting, merged with any persisted overrides. */
    private async readValues(): Promise<Record<string, unknown>> {
        const values: Record<string, unknown> = {};
        for (const def of SETTING_DEFINITIONS) values[def.key] = def.default;

        const rows = await this.dataSource.query<
            { setting_key: string; setting_value: string }[]
        >(`SELECT setting_key, setting_value FROM app_settings`);
        for (const row of rows) {
            if (this.definitions.has(row.setting_key)) {
                values[row.setting_key] = row.setting_value;
            }
        }
        return values;
    }

    /** Public (unauthenticated) flags, e.g. `{ video_consultation_enabled: true }`. */
    async getPublic(): Promise<Record<string, boolean | string>> {
        const values = await this.readValues();
        const out: Record<string, boolean | string> = {};
        for (const def of SETTING_DEFINITIONS) {
            if (def.public) out[def.key] = coerce(def, values[def.key]);
        }
        return out;
    }

    /** Full list for the admin UI. */
    async describe(): Promise<SettingItem[]> {
        const values = await this.readValues();
        return SETTING_DEFINITIONS.map((def) => ({
            ...def,
            value: coerce(def, values[def.key]),
        }));
    }

    /** Role-access flags for any signed-in user (drives the sidebar). */
    async getAccessFlags(): Promise<Record<string, boolean>> {
        const values = await this.readValues();
        const out: Record<string, boolean> = {};
        for (const def of SETTING_DEFINITIONS) {
            if (def.group === 'access') {
                out[def.key] = coerce(def, values[def.key]) === true;
            }
        }
        return out;
    }

    /** Convenience guard used by feature code, e.g. the booking service. */
    async isEnabled(key: string): Promise<boolean> {
        const def = this.definitions.get(key);
        if (!def) return false;
        const values = await this.readValues();
        return coerce(def, values[key]) === true;
    }

    /**
     * `isEnabled` with a short TTL. Used by the roles guard, which runs on every
     * authenticated request; without this each request would re-read the table.
     */
    async isEnabledCached(key: string, ttlMs = 5000): Promise<boolean> {
        const now = Date.now();
        const hit = this.enabledCache.get(key);
        if (hit && hit.expiresAt > now) return hit.value;
        const value = await this.isEnabled(key);
        this.enabledCache.set(key, { value, expiresAt: now + ttlMs });
        return value;
    }

    /** Upsert one or more settings; unknown keys are rejected. */
    async update(patch: Record<string, unknown>): Promise<SettingItem[]> {
        const entries = Object.entries(patch || {});
        if (entries.length === 0)
            throw new BadRequestException('No settings supplied');

        for (const [key, raw] of entries) {
            const def = this.definitions.get(key);
            if (!def) throw new BadRequestException(`Unknown setting: ${key}`);
            const value =
                def.type === 'boolean'
                    ? (coerce(def, raw) as boolean)
                        ? 'true'
                        : 'false'
                    : String(raw ?? '');
            await this.dataSource.query(
                `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                [key, value],
            );
        }
        // A changed flag must take effect immediately for the roles guard.
        this.enabledCache.clear();
        return this.describe();
    }
}
