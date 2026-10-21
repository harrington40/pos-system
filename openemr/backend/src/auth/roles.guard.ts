import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { SettingsService } from '../settings/settings.service';

/** Authenticated principal attached by `JwtAuthGuard`. */
interface RolesUser {
    sub?: number | string;
    role?: string;
}

/** Authenticated request as seen by the roles guard. */
interface RolesRequest {
    user?: RolesUser;
}

/**
 * Roles guard — checks if the authenticated user has the required role(s).
 *
 * Must run AFTER JwtAuthGuard (which sets req.user).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 *
 * Hierarchy:
 *   admin     → can do everything (always granted)
 *   physician → clinical + patients + scheduling
 *   nurse / registered_nurse → clinical + patient registration + vitals (NEWS2, BMI, BP classification)
 *   midwife   → maternal care + delivery tracking + newborn assessments
 *   lab_tech  → lab orders + results management + specimen tracking
 *   front_desk → patients + scheduling + provider management + user registration
 *   billing   → billing only
 *
 * Front-office sharing: when the `registrar_billing_shared_access` setting is
 * on, `billing` is granted every `front_desk` route and `front_desk` is granted
 * every `billing` route. The setting is admin-configurable and cached briefly
 * so the per-request check does not hit the database each time.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(
        private reflector: Reflector,
        private readonly settings: SettingsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No @Roles() decorator → public or only JWT required
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest<RolesRequest>();
        if (!user) {
            return false;
        }

        // Admin bypasses all role checks
        if (user.role === 'admin') {
            return true;
        }

        if (user.role === undefined) return false;

        // Direct match first — this is the common path and needs no DB read.
        if (requiredRoles.includes(user.role)) return true;

        // Front-office sharing: billing ⇄ registrar (front desk).
        const partnerRole =
            user.role === 'billing'
                ? 'front_desk'
                : user.role === 'front_desk'
                  ? 'billing'
                  : null;
        if (!partnerRole || !requiredRoles.includes(partnerRole)) return false;

        try {
            return await this.settings.isEnabledCached(
                'registrar_billing_shared_access',
            );
        } catch (err) {
            // Fail closed: if the flag cannot be read, do not widen access.
            this.logger.warn(
                `Shared front-office access check failed: ${(err as Error).message}`,
            );
            return false;
        }
    }
}
