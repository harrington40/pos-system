import { useQuery } from '@tanstack/react-query';
import nestClient from '../api/nest-client';

export interface LicenseStatus {
    valid: boolean;
    tier?: 'basic' | 'professional' | 'enterprise';
    expiresAt?: string;
    daysRemaining?: number;
    customerName?: string;
    maxUsers?: number;
}

/**
 * The single place the shell asks about licensing.
 *
 * Shared by the layout banner and the top bar so the two cannot disagree about
 * whether this install is licensed, and keyed identically to the licence page so
 * all three read one cache entry instead of polling the endpoint separately.
 */
export function useLicenseStatus() {
    return useQuery<LicenseStatus>({
        queryKey: ['license-status'],
        queryFn: async () => {
            const r = await nestClient.get('/license/status');
            return r.data;
        },
        refetchInterval: 3600000, // refresh every hour
    });
}
