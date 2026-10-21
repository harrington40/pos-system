import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { SettingsService } from '../settings/settings.service';

/**
 * Roles guard contract, including the configurable front-office sharing that
 * lets billing use registrar (front desk) routes and registrar use billing
 * routes.
 */
describe('RolesGuard', () => {
    function context(role?: string): ExecutionContext {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ user: role ? { role } : undefined }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as unknown as ExecutionContext;
    }

    function build(requiredRoles: string[] | undefined, shared = false) {
        const reflector = {
            getAllAndOverride: jest.fn(() => requiredRoles),
        } as unknown as Reflector;
        const isEnabledCached = jest.fn(async () => shared);
        const settings = {
            isEnabledCached,
        } as unknown as SettingsService;
        return { guard: new RolesGuard(reflector, settings), isEnabledCached };
    }

    it('allows a direct role match without reading the setting', async () => {
        const { guard, isEnabledCached } = build(['front_desk']);
        await expect(guard.canActivate(context('front_desk'))).resolves.toBe(true);
        expect(isEnabledCached).not.toHaveBeenCalled();
    });

    it('lets billing use registrar (front_desk) routes when sharing is on', async () => {
        const { guard, isEnabledCached } = build(['admin', 'front_desk'], true);
        await expect(guard.canActivate(context('billing'))).resolves.toBe(true);
        expect(isEnabledCached).toHaveBeenCalledWith(
            'registrar_billing_shared_access',
        );
    });

    it('lets the registrar use billing routes when sharing is on', async () => {
        const { guard } = build(['admin', 'billing'], true);
        await expect(guard.canActivate(context('front_desk'))).resolves.toBe(true);
    });

    it('keeps the roles separate when sharing is off', async () => {
        const { guard } = build(['admin', 'front_desk'], false);
        await expect(guard.canActivate(context('billing'))).resolves.toBe(false);
    });

    it('does not consult the setting for unrelated roles', async () => {
        const { guard, isEnabledCached } = build(['admin', 'billing'], true);
        await expect(guard.canActivate(context('lab_tech'))).resolves.toBe(false);
        expect(isEnabledCached).not.toHaveBeenCalled();
    });

    it('still grants admin everything', async () => {
        const { guard } = build(['billing'], false);
        await expect(guard.canActivate(context('admin'))).resolves.toBe(true);
    });

    it('fails closed when the setting cannot be read', async () => {
        const { guard, isEnabledCached } = build(['billing']);
        (isEnabledCached as jest.Mock).mockRejectedValueOnce(new Error('db down'));
        await expect(guard.canActivate(context('front_desk'))).resolves.toBe(false);
    });

    it('rejects an unauthenticated request', async () => {
        const { guard } = build(['billing']);
        await expect(guard.canActivate(context())).resolves.toBe(false);
    });

    it('allows routes without a @Roles decorator', async () => {
        const { guard } = build(undefined);
        await expect(guard.canActivate(context())).resolves.toBe(true);
    });
});
