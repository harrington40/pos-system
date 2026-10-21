import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import nestClient from '../api/nest-client';
import { useAuth } from './useAuth';

/** Server-backed role-access flags (`GET /settings/access`). */
interface RoleAccessFlags {
  registrar_billing_shared_access?: boolean;
}

/** The role whose menus a given front-office role inherits when sharing is on. */
const PARTNER_ROLE: Record<string, string> = {
  billing: 'front_desk',
  front_desk: 'billing',
};

/**
 * Effective roles for menu/feature visibility.
 *
 * When the admin turns on `registrar_billing_shared_access`, billing users also
 * match `front_desk` menu definitions and registrar users also match `billing`
 * ones. The API applies the same rule in `RolesGuard`, so the menus and the
 * endpoints cannot disagree.
 */
export function useRoleAccess() {
  const { user } = useAuth();

  const { data } = useQuery<RoleAccessFlags>({
    queryKey: ['settings', 'access'],
    queryFn: async () => (await nestClient.get('/settings/access')).data,
    enabled: !!user,
    staleTime: 30000,
  });

  const sharedFrontOfficeAccess = data?.registrar_billing_shared_access === true;

  const effectiveRoles = useMemo(() => {
    const roles = new Set<string>();
    if (user?.role) roles.add(user.role);
    const partner = user?.role ? PARTNER_ROLE[user.role] : undefined;
    if (sharedFrontOfficeAccess && partner) roles.add(partner);
    return roles;
  }, [user?.role, sharedFrontOfficeAccess]);

  /** True when the user's own role or its configured partner role is allowed. */
  const hasAnyRole = (allowed: readonly string[]): boolean =>
    allowed.some((role) => effectiveRoles.has(role));

  return { sharedFrontOfficeAccess, effectiveRoles, hasAnyRole };
}
