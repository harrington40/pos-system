import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Logger,
} from '@nestjs/common';
import { LicenseService } from './license.service';

/**
 * License guard — blocks all API requests if no valid license exists.
 *
 * Enforcement is an explicit opt-in: it stays off unless LICENSE_ENFORCEMENT
 * is exactly 'true'. A variable that merely goes missing must never lock a
 * running install out of its own API — the same fail-open trap that turned
 * DB_LOGGING into a patient-data leak when NODE_ENV disappeared.
 *
 * The paths below stay reachable in every state, because an unlicensed install
 * must still be able to log in, read its status, activate a key and mint one.
 * /license/generate and /license/revoke are not unauthenticated by virtue of
 * being listed here — they carry their own JwtAuthGuard + admin role check.
 */
@Injectable()
export class LicenseGuard implements CanActivate {
    private readonly logger = new Logger(LicenseGuard.name);

    private readonly enforcementEnabled =
        process.env.LICENSE_ENFORCEMENT === 'true';

    private readonly EXEMPT_PATHS = [
        '/api/license/activate',
        '/api/license/status',
        '/api/license/generate',
        '/api/license/revoke',
        '/api/license/verify-passphrase',
        '/api/auth/login',
    ];

    constructor(private readonly licenseService: LicenseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Explicit opt-in — see the class comment.
        if (!this.enforcementEnabled) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<{ path?: string; url?: string }>();
        const path = request.path || request.url || '';

        // Allow exempt paths
        if (this.EXEMPT_PATHS.some((p) => path.startsWith(p))) {
            return true;
        }

        // Check license
        const valid = await this.licenseService.isValid();
        if (!valid) {
            this.logger.warn(`Blocked request to ${path}: no valid license`);
            return false;
        }

        return true;
    }
}
