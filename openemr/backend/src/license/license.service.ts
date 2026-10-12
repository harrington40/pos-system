import {
    Injectable,
    Logger,
    BadRequestException,
    OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import * as crypto from 'crypto';
import { License, LicenseTier } from './license.entity';

/**
 * Local license generation and validation.
 *
 * Signing secrets come from the environment, never from this file — a secret
 * committed to source is a secret in every customer's hands, and anyone
 * holding it can mint a key for any tier and duration.
 *
 * Rotation: set LICENSE_SECRET_CURRENT to the new secret and move the retired
 * one into LICENSE_SECRET_LEGACY (comma-separated, oldest last) so keys
 * already in the field keep validating. Keys are tried against each secret in
 * order. With nothing configured the service fails closed: no key validates
 * and no key can be generated.
 */
@Injectable()
export class LicenseService implements OnModuleInit {
    private readonly logger = new Logger(LicenseService.name);

    // Current secret first, then any retired ones (LICENSE_SECRET_LEGACY is a
    // comma-separated list so more than one rotation can stay valid at once).
    private readonly SIGNING_SECRETS: string[] = [
        process.env.LICENSE_SECRET_CURRENT,
        ...(process.env.LICENSE_SECRET_LEGACY || '').split(','),
    ]
        .map((secret) => (secret || '').trim())
        .filter((secret) => secret.length > 0);

    // SHA-256 of the key-generator passphrase, supplied via the environment.
    // Generate with: printf 'your-passphrase' | sha256sum
    private readonly GENERATOR_PASSPHRASE_HASH = (
        process.env.LICENSE_GENERATOR_PASSPHRASE_HASH || ''
    )
        .trim()
        .toLowerCase();

    onModuleInit(): void {
        if (this.SIGNING_SECRETS.length === 0) {
            this.logger.error(
                'No license signing secret configured (LICENSE_SECRET_CURRENT). ' +
                    'License keys cannot be validated or generated — every new ' +
                    'activation will be rejected. Set it in the environment.',
            );
        }
    }

    /**
     * Verify the generator passphrase server-side.
     * No secrets exposed in client-side code.
     *
     * Fails closed: with no hash configured, nothing verifies.
     */
    verifyGeneratorPassphrase(passphrase: string): boolean {
        if (this.GENERATOR_PASSPHRASE_HASH.length === 0) {
            return false;
        }
        const hash = crypto
            .createHash('sha256')
            .update(passphrase)
            .digest('hex');
        return hash === this.GENERATOR_PASSPHRASE_HASH;
    }

    constructor(
        @InjectRepository(License)
        private readonly licenseRepo: Repository<License>,
    ) {}

    /**
     * The secret used to sign newly generated keys.
     * Generation has no fail-open path: with no secret there is nothing to
     * sign with, so it is an error rather than a default.
     */
    private get currentSecret(): string {
        const secret = this.SIGNING_SECRETS[0];
        if (!secret) {
            throw new Error(
                'LICENSE_SECRET_CURRENT is not set, so license keys cannot be ' +
                    'generated. Set the signing secret in the environment.',
            );
        }
        return secret;
    }

    // ── Key Generation (server-side) ─────────────────────────

    /**
     * Key layout — every field is fixed width and covered by the checksum, so
     * decoding is a set of offsets rather than a guess:
     *
     *   OPENRX     magic                                    6 chars
     *   T          tier code, B | P | E                     1 char
     *   tttttttt   issued-at, seconds since the epoch, hex  8 chars  (until 2106)
     *   DD         duration in months, hex, zero padded     2 chars
     *   NNNNNNNN   random nonce, hex                        8 chars
     *   CCCCCCCC   HMAC-SHA256 of "T-tttttttt-DD-NNNNNNNN"  8 chars
     *
     * Rendered as OPENRX-B6B0B-28C001-1A2B3C4D-9E8F7A6B.
     */
    private readonly KEY_MAGIC = 'OPENRX';
    private readonly ISSUED_AT_HEX_LENGTH = 8;
    private readonly DURATION_HEX_LENGTH = 2;
    private readonly NONCE_HEX_LENGTH = 8;

    /**
     * Checksum width in hex characters.
     *
     * 4 characters is 16 bits. A forger without the signing secret cannot
     * compute the MAC, so their only route is guessing a value the server
     * accepts — 65,536 attempts, which is scriptable in an afternoon. 8
     * characters is 32 bits and puts that out of reach.
     */
    private readonly CHECKSUM_HEX_LENGTH = 8;

    private readonly TIER_CODES: Record<LicenseTier, string> = {
        basic: 'B',
        professional: 'P',
        enterprise: 'E',
    };

    private readonly TIER_BY_CODE: Record<string, LicenseTier> = {
        B: 'basic',
        P: 'professional',
        E: 'enterprise',
    };

    /** Canonical payload for a key's fields. */
    private canonicalPayload(
        tierCode: string,
        issuedAtHex: string,
        durationHex: string,
        nonce: string,
    ): string {
        return `${tierCode}-${issuedAtHex}-${durationHex}-${nonce}`;
    }

    /** HMAC-SHA256 of a canonical payload, truncated to the checksum field. */
    private sign(payload: string, secret: string = this.currentSecret): string {
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex')
            .slice(0, this.CHECKSUM_HEX_LENGTH)
            .toLowerCase();
    }

    /**
     * Generate a license key for a given tier and duration.
     * Signs with the current secret (LICENSE_SECRET_CURRENT).
     */
    generateKey(tier: LicenseTier, durationMonths: number): string {
        if (
            !Number.isInteger(durationMonths) ||
            durationMonths < 1 ||
            durationMonths > 36
        ) {
            throw new BadRequestException(
                'durationMonths must be a whole number between 1 and 36',
            );
        }

        const tierCode = this.TIER_CODES[tier];
        // Seconds, not milliseconds: 8 hex digits covers the epoch until 2106,
        // whereas the low 32 bits of a millisecond clock moved every 49 days
        // and put every derived expiry date in 1970.
        // Uppercased like every other field: decodeKey upper-cases the key
        // before rebuilding the payload, so a lower-case digit here would sign
        // a different string than the one it is validated against — the exact
        // drift that made the previous format's keys unusable.
        const issuedAtHex = Math.floor(Date.now() / 1000)
            .toString(16)
            .toUpperCase()
            .padStart(this.ISSUED_AT_HEX_LENGTH, '0');
        const durationHex = durationMonths
            .toString(16)
            .toUpperCase()
            .padStart(this.DURATION_HEX_LENGTH, '0');
        // Random, so several keys minted in the same millisecond stay distinct.
        // A batch used to collide on the shared timestamp and then hit the
        // unique index on licenseKey.
        const nonce = crypto
            .randomBytes(this.NONCE_HEX_LENGTH / 2)
            .toString('hex')
            .toUpperCase();
        const checksum = this.sign(
            this.canonicalPayload(tierCode, issuedAtHex, durationHex, nonce),
        );

        return [
            this.KEY_MAGIC,
            `${tierCode}${issuedAtHex.slice(0, 4)}`,
            `${issuedAtHex.slice(4)}${durationHex}`,
            nonce,
            checksum.toUpperCase(),
        ].join('-');
    }

    /**
     * Validate and decode a license key.
     * Tries all secret versions (supports rotation).
     */
    decodeKey(key: string): {
        tier: LicenseTier;
        generatedAt: number;
        durationMonths: number;
    } | null {
        for (const secret of this.SIGNING_SECRETS) {
            const result = this.decodeKeyWithSecret(key, secret);
            if (result) return result;
        }
        return null;
    }

    private decodeKeyWithSecret(
        key: string,
        secret: string,
    ): {
        tier: LicenseTier;
        generatedAt: number;
        durationMonths: number;
    } | null {
        try {
            const clean = key.replace(/-/g, '').toUpperCase();
            const expectedLength =
                this.KEY_MAGIC.length +
                1 +
                this.ISSUED_AT_HEX_LENGTH +
                this.DURATION_HEX_LENGTH +
                this.NONCE_HEX_LENGTH +
                this.CHECKSUM_HEX_LENGTH;
            if (clean.length !== expectedLength) return null;
            if (!clean.startsWith(this.KEY_MAGIC)) return null;

            // Offsets follow the layout comment on the constants above.
            let cursor = this.KEY_MAGIC.length;
            const tierCode = clean.slice(cursor, (cursor += 1));
            const issuedAtHex = clean.slice(
                cursor,
                (cursor += this.ISSUED_AT_HEX_LENGTH),
            );
            const durationHex = clean.slice(
                cursor,
                (cursor += this.DURATION_HEX_LENGTH),
            );
            const nonce = clean.slice(cursor, (cursor += this.NONCE_HEX_LENGTH));
            const checksum = clean.slice(
                cursor,
                (cursor += this.CHECKSUM_HEX_LENGTH),
            );

            const tier = this.TIER_BY_CODE[tierCode];
            const durationMonths = parseInt(durationHex, 16);
            if (!tier) return null;
            if (!/^[0-9A-F]+$/.test(issuedAtHex + durationHex + nonce)) {
                return null;
            }
            if (
                isNaN(durationMonths) ||
                durationMonths < 1 ||
                durationMonths > 36
            ) {
                return null;
            }

            // One shared helper signs both sides. Hand-rolling the payload here
            // is what let generation and validation drift apart on case.
            const expected = this.sign(
                this.canonicalPayload(
                    tierCode,
                    issuedAtHex,
                    durationHex,
                    nonce,
                ),
                secret,
            );
            if (expected !== checksum.toLowerCase()) return null;

            return {
                tier,
                // Only seconds are carried, and expiry counts from activation
                // anyway — this is for diagnostics.
                generatedAt: parseInt(issuedAtHex, 16) * 1000,
                durationMonths,
            };
        } catch {
            return null;
        }
    }

    // ── Activation ─────────────────────────────────────────────

    async activateKey(key: string, customerName?: string): Promise<License> {
        const decoded = this.decodeKey(key);
        if (!decoded) {
            throw new BadRequestException('Invalid license key');
        }

        const existing = await this.licenseRepo.findOne({
            where: { licenseKey: key },
        });
        // Refuse a key already in force: re-activating it would reset the term
        // from today, so repeating the call would extend it indefinitely.
        if (existing && existing.status === 'active') {
            throw new BadRequestException('License key already activated');
        }

        // Only one license is in force at a time, and activating is what makes
        // a key current — the UI promises a new key takes effect immediately.
        // This runs after the guard above so an already-active key still trips
        // it, and it stops two active rows from racing to be returned by
        // getActiveLicense(), which picks the latest expiry.
        await this.licenseRepo.update(
            { status: 'active' },
            { status: 'superseded' },
        );

        if (existing) {
            existing.status = 'active';
            // Counted from activation, not from when the key was minted: a key
            // that sat unopened for a month should still deliver its full term.
            const reactivatedAt = new Date();
            const reactivatedExpiry = new Date(reactivatedAt);
            reactivatedExpiry.setMonth(
                reactivatedExpiry.getMonth() + decoded.durationMonths,
            );
            existing.activatedAt = reactivatedAt;
            existing.expiresAt = reactivatedExpiry;
            existing.customerName = customerName || existing.customerName;
            existing.tier = decoded.tier;
            return this.licenseRepo.save(existing);
        }

        const activatedAt = new Date();
        const expiresAt = new Date(activatedAt);
        expiresAt.setMonth(expiresAt.getMonth() + decoded.durationMonths);

        const maxUsersMap: Record<LicenseTier, number> = {
            basic: 5,
            professional: 25,
            enterprise: 100,
        };

        const license = this.licenseRepo.create({
            licenseKey: key,
            tier: decoded.tier,
            activatedAt,
            expiresAt,
            status: 'active',
            customerName: customerName || '',
            maxUsers: maxUsersMap[decoded.tier],
        });

        const saved = await this.licenseRepo.save(license);
        this.logger.log(
            `License activated: ${key} → expires ${expiresAt.toISOString()}`,
        );
        return saved;
    }

    // ── Validation ────────────────────────────────────────────

    async getActiveLicense(): Promise<License | null> {
        const now = new Date();
        await this.licenseRepo.update(
            { status: 'active', expiresAt: LessThanOrEqual(now) },
            { status: 'expired' },
        );
        return this.licenseRepo.findOne({
            where: { status: 'active' },
            order: { expiresAt: 'DESC' },
        });
    }

    async isValid(): Promise<boolean> {
        const license = await this.getActiveLicense();
        return license !== null;
    }

    async getStatus(): Promise<{
        valid: boolean;
        tier?: LicenseTier;
        expiresAt?: Date;
        daysRemaining?: number;
        customerName?: string;
        maxUsers?: number;
    }> {
        const license = await this.getActiveLicense();
        if (!license) return { valid: false };

        const now = new Date();
        const daysRemaining = Math.ceil(
            (license.expiresAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
        );

        return {
            valid: true,
            tier: license.tier,
            expiresAt: license.expiresAt,
            daysRemaining: Math.max(0, daysRemaining),
            customerName: license.customerName,
            maxUsers: license.maxUsers,
        };
    }

    /**
     * How many users the active license allows, or null when nothing is
     * licensed — callers must then impose no cap. An unlicensed install is not
     * a licensed install with zero seats, and enforcement is opt-in elsewhere.
     */
    async getUserLimit(): Promise<number | null> {
        const license = await this.getActiveLicense();
        return license ? license.maxUsers : null;
    }

    // ── Revocation ────────────────────────────────────────────

    async revoke(licenseKey: string): Promise<void> {
        const license = await this.licenseRepo.findOne({
            where: { licenseKey },
        });
        if (!license) throw new BadRequestException('License not found');
        license.status = 'revoked';
        await this.licenseRepo.save(license);
        this.logger.log(`License revoked: ${licenseKey}`);
    }

    // ── Batch Generation ─────────────────────────────────────

    generateBatch(
        tier: LicenseTier,
        durationMonths: number,
        count: number,
    ): string[] {
        const keys: string[] = [];
        for (let i = 0; i < count; i++) {
            keys.push(this.generateKey(tier, durationMonths));
        }
        return keys;
    }
}
