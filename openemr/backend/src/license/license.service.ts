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
     * Checksum width in hex characters.
     *
     * 4 characters is 16 bits. A forger without the signing secret cannot
     * compute the MAC, so their only route is guessing a value the server
     * accepts — 65,536 attempts, which is scriptable in an afternoon. 8
     * characters is 32 bits and puts that out of reach.
     */
    private readonly CHECKSUM_HEX_LENGTH = 8;

    /**
     * Generate a license key for a given tier and duration.
     * Signs with the current secret (LICENSE_SECRET_CURRENT).
     */
    generateKey(tier: LicenseTier, durationMonths: number): string {
        const tierCode = tier[0].toUpperCase();
        // Uppercase here, not just in the returned string: the payload signed
        // below has to be byte-for-byte what decodeKeyWithSecret rebuilds, and
        // that one rebuilds from the uppercased key. Signing the lowercase
        // form produced keys that could never validate.
        const ts = Date.now().toString(16).slice(-8).toUpperCase();
        const payload = `${tierCode}-${ts}-${durationMonths}`;
        const checksum = crypto
            .createHmac('sha256', this.currentSecret)
            .update(payload)
            .digest('hex')
            .slice(0, this.CHECKSUM_HEX_LENGTH);
        return `OPENRX-${tierCode}${ts.slice(0, 4)}-${ts.slice(4)}${durationMonths.toString(16)}-${checksum}`.toUpperCase();
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
            if (!clean.startsWith('OPENRX')) return null;

            const tierCode = clean[6];
            const ts1 = clean.slice(7, 11);
            const ts2AndDur = clean.slice(11);
            const checksum = ts2AndDur.slice(-this.CHECKSUM_HEX_LENGTH);
            const ts2 = ts2AndDur.slice(0, 4);
            const durHex = ts2AndDur.slice(4, -this.CHECKSUM_HEX_LENGTH);
            const durationMonths = parseInt(durHex, 16);

            const tierMap: Record<string, LicenseTier> = {
                B: 'basic',
                P: 'professional',
                E: 'enterprise',
            };
            const tier = tierMap[tierCode];
            if (
                !tier ||
                isNaN(durationMonths) ||
                durationMonths < 1 ||
                durationMonths > 36
            )
                return null;

            const ts = ts1 + ts2;
            const payload = `${tierCode}-${ts}-${durationMonths}`;
            const expected = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex')
                .slice(0, this.CHECKSUM_HEX_LENGTH);

            // The key is upper-cased above while a hex digest comes back
            // lower-case, so normalise before comparing. Comparing the two raw
            // strings is what made every generated key fail validation.
            if (expected !== checksum.toLowerCase()) return null;

            return {
                tier,
                generatedAt: parseInt(ts, 16),
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
        if (existing) {
            if (existing.status === 'active') {
                throw new BadRequestException('License key already activated');
            }
            existing.status = 'active';
            existing.activatedAt = new Date();
            const expiry = new Date(decoded.generatedAt);
            expiry.setMonth(expiry.getMonth() + decoded.durationMonths);
            existing.expiresAt = expiry;
            existing.customerName = customerName || existing.customerName;
            existing.tier = decoded.tier;
            return this.licenseRepo.save(existing);
        }

        const generatedDate = new Date(decoded.generatedAt);
        const expiresAt = new Date(generatedDate);
        expiresAt.setMonth(expiresAt.getMonth() + decoded.durationMonths);

        const maxUsersMap: Record<LicenseTier, number> = {
            basic: 5,
            professional: 25,
            enterprise: 100,
        };

        const license = this.licenseRepo.create({
            licenseKey: key,
            tier: decoded.tier,
            activatedAt: new Date(),
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
