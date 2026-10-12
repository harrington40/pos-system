import { Logger } from '@nestjs/common';

const logger = new Logger('JwtSecret');

/**
 * Values that are public in this repository's history. A deployment using one of
 * these shares its signing key with everyone who can read the source, which is
 * enough to mint a token for any user and any role.
 */
const COMPROMISED_SECRETS = ['openrx-secret-key-2024'];

/**
 * The single source of the JWT signing secret, read from the environment.
 *
 * Deliberately resolved by a factory when modules are instantiated rather than
 * at module evaluation time. ConfigModule loads .env while the module graph is
 * being assembled, so a read at module scope happens *before* .env exists and
 * silently lands on a fallback. That is how the previous setup managed to sign
 * with the value baked into the source while verifying with the one from .env —
 * it only worked because the two happened to be the same string, and rotating
 * JWT_SECRET quietly broke every login instead of taking effect.
 *
 * There is no default: signing tokens with a value that ships in the source is
 * the same as having no authentication at all.
 */
export function getJwtSecret(): string {
    const secret = (process.env.JWT_SECRET || '').trim();

    if (!secret) {
        throw new Error(
            'JWT_SECRET is not set. Refusing to sign or verify tokens with a ' +
                'built-in default — set it in the environment, for example ' +
                'with: openssl rand -hex 32',
        );
    }

    if (COMPROMISED_SECRETS.includes(secret)) {
        throw new Error(
            'JWT_SECRET is set to a value that is public in this repository, ' +
                'so every token would be forgeable. Rotate it, for example ' +
                'with: openssl rand -hex 32',
        );
    }

    if (secret.length < 32) {
        logger.warn(
            'JWT_SECRET is shorter than 32 characters and easier to guess than ' +
                'it should be. Generate one with: openssl rand -hex 32',
        );
    }

    return secret;
}
