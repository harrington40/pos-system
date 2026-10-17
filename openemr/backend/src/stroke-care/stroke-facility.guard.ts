import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { StrokeCareService, type StrokeActor } from './stroke-care.service';

interface StrokeFacilityRequest {
  user?: {
    sub?: number | string;
    id?: number | string;
    username?: string;
    displayName?: string;
    role?: string;
  };
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

/**
 * Enforces explicit facility scope on stroke endpoints that accept a
 * facilityId. Detail/patient routes remain available to authorized clinicians
 * because longitudinal stroke care intentionally spans facilities; writes are
 * still audited and role-gated.
 */
@Injectable()
export class StrokeFacilityGuard implements CanActivate {
  constructor(private readonly stroke: StrokeCareService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StrokeFacilityRequest>();
    const raw =
      request.params?.facilityId ??
      request.query?.facilityId ??
      request.body?.facilityId;
    if (raw === undefined || raw === null || raw === '') return true;
    const facilityId = Number(raw);
    if (!Number.isInteger(facilityId) || facilityId < 1) return true;
    if (!request.user)
      throw new UnauthorizedException('Authentication required');
    const actor: StrokeActor = {
      id: Number(request.user.sub ?? request.user.id) || undefined,
      username: request.user.username,
      displayName: request.user.displayName,
      role: request.user.role,
    };
    await this.stroke.assertFacilityAccess(actor, facilityId);
    return true;
  }
}
