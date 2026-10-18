import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Global rollout switch for Stroke Care.
 *
 * Production must set STROKE_CARE_ENABLED=false until clinical validation and
 * deployment approval are complete. Undefined keeps the historical behavior
 * (enabled) for existing installations and test environments.
 */
@Injectable()
export class StrokeFeatureGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.STROKE_CARE_ENABLED === 'false') {
      throw new ServiceUnavailableException(
        'Stroke Care is disabled at this facility until deployment approval.',
      );
    }
    return true;
  }
}
