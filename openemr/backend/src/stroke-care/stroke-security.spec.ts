import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';
import { StrokeCareController } from './stroke-care.controller';
import { StrokeFacilityGuard } from './stroke-facility.guard';
import type { StrokeCareService } from './stroke-care.service';

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Stroke Care security controls', () => {
  it('checks explicit facility scope for authenticated users', async () => {
    const assertFacilityAccess = jest.fn().mockResolvedValue(undefined);
    const guard = new StrokeFacilityGuard({
      assertFacilityAccess,
    } as unknown as StrokeCareService);
    await expect(
      guard.canActivate(
        contextWith({
          params: { facilityId: '2' },
          user: { sub: 42, role: 'physician' },
        }),
      ),
    ).resolves.toBe(true);
    expect(assertFacilityAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, role: 'physician' }),
      2,
    );
  });

  it('requires authentication when a facility is explicitly supplied', async () => {
    const guard = new StrokeFacilityGuard({
      assertFacilityAccess: jest.fn(),
    } as unknown as StrokeCareService);
    await expect(
      guard.canActivate(contextWith({ query: { facilityId: '2' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not impose a facility check when no facility is supplied', async () => {
    const assertFacilityAccess = jest.fn();
    const guard = new StrokeFacilityGuard({
      assertFacilityAccess,
    } as unknown as StrokeCareService);
    await expect(guard.canActivate(contextWith({}))).resolves.toBe(true);
    expect(assertFacilityAccess).not.toHaveBeenCalled();
  });

  it('restricts facility administration and audit exports to senior roles', () => {
    const rolesFor = (method: string): string[] => {
      const descriptor = Object.getOwnPropertyDescriptor(
        StrokeCareController.prototype,
        method,
      );
      const target = (descriptor?.value ?? {}) as object;
      return Reflect.getMetadata(ROLES_KEY, target) as string[];
    };
    const admin = rolesFor('setFacilitySettings');
    const audit = rolesFor('exportAudit');
    const clinical = rolesFor('addAssessment');
    expect(admin).toEqual(['admin']);
    expect(audit).toEqual(['admin', 'physician']);
    expect(clinical).toEqual([
      'admin',
      'physician',
      'nurse',
      'registered_nurse',
    ]);
    expect(clinical).not.toContain('front_desk');
    expect(clinical).not.toContain('billing');
  });
});
