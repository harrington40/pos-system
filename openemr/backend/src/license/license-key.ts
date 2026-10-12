import * as crypto from 'crypto';

/**
 * Licence key format and cryptography.
 *
 * Deliberately free of Nest and database imports, so the server, the tests and
 * the offline generator script all run the same code. Writing this out twice is
 * what let generation and validation disagree on case — twice — and a second
 * copy drifting silently would be worse than either bug.
 *
 * Layout, after stripping dashes. Every field is fixed width and all of it is
 * covered by the checksum:
 *
 *   OPENRX     magic                                       6 chars
 *   T          tier code, B | P | E                        1 char
 *   tttttttt   issued-at, seconds since the epoch, hex      8 chars (until 2106)
 *   DD         duration in months, hex, zero padded         2 chars
 *   NNNNNNNN   random nonce, hex                            8 chars
 *   CCCCCCCC   HMAC-SHA256 of "T-tttttttt-DD-NNNNNNNN"      8 chars
 *
 * Rendered as OPENRX-B6B0B-28C001-1A2B3C4D-9E8F7A6B — 37 characters.
 */

export type LicenseTier = 'basic' | 'professional' | 'enterprise';

/** Seats each tier includes. Enforced on user creation and approval. */
export const TIER_MAX_USERS: Record<LicenseTier, number> = {
    basic: 5,
    professional: 25,
    enterprise: 100,
};

export const TIER_CODES: Record<LicenseTier, string> = {
    basic: 'B',
    professional: 'P',
    enterprise: 'E',
};

export const TIER_BY_CODE: Record<string, LicenseTier> = {
    B: 'basic',
    P: 'professional',
    E: 'enterprise',
};

export const KEY_MAGIC = 'OPENRX';
export const ISSUED_AT_HEX_LENGTH = 8;
export const DURATION_HEX_LENGTH = 2;
export const NONCE_HEX_LENGTH = 8;

/**
 * Checksum width in hex characters.
 *
 * 4 characters is 16 bits. A forger without the signing secret cannot compute
 * the MAC, so their only route is guessing a value the server accepts: 65,536
 * attempts, scriptable in an afternoon. 8 characters is 32 bits.
 */
export const CHECKSUM_HEX_LENGTH = 8;

export const MIN_MONTHS = 1;
export const MAX_MONTHS = 36;

/** Length of a canonical key including dashes: 37. */
export const KEY_LENGTH =
    KEY_MAGIC.length +
    1 +
    ISSUED_AT_HEX_LENGTH +
    DURATION_HEX_LENGTH +
    NONCE_HEX_LENGTH +
    CHECKSUM_HEX_LENGTH;

export interface KeyFields {
    tierCode: string;
    issuedAtHex: string;
    durationHex: string;
    nonce: string;
    checksum: string;
}

export interface DecodedKey {
    tier: LicenseTier;
    /** Issued-at in ms, diagnostics only — terms run from activation. */
    generatedAt: number;
    durationMonths: number;
    /** The key re-rendered canonically, for storage and lookup. */
    canonicalKey: string;
    /** Stable identity for a key that has no database row. */
    keyHash: string;
}

/** Canonical message that gets signed. */
export function canonicalPayload(fields: KeyFields): string {
    return `${fields.tierCode}-${fields.issuedAtHex}-${fields.durationHex}-${fields.nonce}`;
}

/** HMAC-SHA256 of a payload, truncated to the checksum field (lower case). */
export function sign(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
        .slice(0, CHECKSUM_HEX_LENGTH)
        .toLowerCase();
}

/** Render the dashed, upper-case form. The single place a key string is built. */
export function renderKey(fields: KeyFields): string {
    return [
        KEY_MAGIC,
        `${fields.tierCode}${fields.issuedAtHex.slice(0, 4)}`,
        `${fields.issuedAtHex.slice(4)}${fields.durationHex}`,
        fields.nonce,
        fields.checksum.toUpperCase(),
    ].join('-');
}

/**
 * Strip what is presentation rather than identity: dashes, and whitespace from
 * a key pasted out of an email.
 */
export function normaliseKey(key: string): string {
    return key.replace(/[\s-]/g, '').toUpperCase();
}

/** SHA-256 of a canonical key — a stable id for a key with no row. */
export function hashKey(canonicalKey: string): string {
    return crypto.createHash('sha256').update(canonicalKey).digest('hex');
}

/** Structural parse. Does not verify the checksum. */
export function parseKey(key: string): KeyFields | null {
    const clean = normaliseKey(key);
    if (clean.length !== KEY_LENGTH) return null;
    if (!clean.startsWith(KEY_MAGIC)) return null;

    let cursor = KEY_MAGIC.length;
    const tierCode = clean.slice(cursor, (cursor += 1));
    const issuedAtHex = clean.slice(cursor, (cursor += ISSUED_AT_HEX_LENGTH));
    const durationHex = clean.slice(cursor, (cursor += DURATION_HEX_LENGTH));
    const nonce = clean.slice(cursor, (cursor += NONCE_HEX_LENGTH));
    const checksum = clean.slice(cursor, (cursor += CHECKSUM_HEX_LENGTH));

    if (!TIER_BY_CODE[tierCode]) return null;
    if (!/^[0-9A-F]+$/.test(issuedAtHex + durationHex + nonce)) return null;

    const durationMonths = parseInt(durationHex, 16);
    if (
        isNaN(durationMonths) ||
        durationMonths < MIN_MONTHS ||
        durationMonths > MAX_MONTHS
    ) {
        return null;
    }

    return { tierCode, issuedAtHex, durationHex, nonce, checksum };
}

/** Mint a key, signed with the given secret (LICENSE_SECRET_CURRENT). */
export function generateKey(
    secret: string,
    tier: LicenseTier,
    durationMonths: number,
): string {
    if (!secret) {
        throw new Error('No signing secret available; cannot generate a key.');
    }
    if (
        !Number.isInteger(durationMonths) ||
        durationMonths < MIN_MONTHS ||
        durationMonths > MAX_MONTHS
    ) {
        throw new Error(
            `durationMonths must be a whole number between ${MIN_MONTHS} and ${MAX_MONTHS}`,
        );
    }
    const tierCode = TIER_CODES[tier];
    if (!tierCode) throw new Error(`Unknown tier: ${tier}`);

    // Seconds, not milliseconds: 8 hex digits covers the epoch until 2106,
    // whereas the low 32 bits of a millisecond clock moved every 49 days.
    const issuedAtHex = Math.floor(Date.now() / 1000)
        .toString(16)
        .toUpperCase()
        .padStart(ISSUED_AT_HEX_LENGTH, '0');
    const durationHex = durationMonths
        .toString(16)
        .toUpperCase()
        .padStart(DURATION_HEX_LENGTH, '0');
    // Random, so keys minted within the same millisecond stay distinct.
    const nonce = crypto
        .randomBytes(NONCE_HEX_LENGTH / 2)
        .toString('hex')
        .toUpperCase();
    const checksum = sign(
        canonicalPayload({
            tierCode,
            issuedAtHex,
            durationHex,
            nonce,
            checksum: '',
        }),
        secret,
    );

    return renderKey({ tierCode, issuedAtHex, durationHex, nonce, checksum });
}

/**
 * Validate and decode against any of the given secrets (newest first).
 * Null when the key is malformed or no secret matches.
 */
export function decodeKey(key: string, secrets: string[]): DecodedKey | null {
    const fields = parseKey(key);
    if (!fields) return null;

    const payload = canonicalPayload(fields);
    for (const secret of secrets) {
        if (!secret) continue;
        if (sign(payload, secret) === fields.checksum.toLowerCase()) {
            const canonicalKey = renderKey(fields);
            return {
                tier: TIER_BY_CODE[fields.tierCode],
                generatedAt: parseInt(fields.issuedAtHex, 16) * 1000,
                durationMonths: parseInt(fields.durationHex, 16),
                canonicalKey,
                keyHash: hashKey(canonicalKey),
            };
        }
    }
    return null;
}

