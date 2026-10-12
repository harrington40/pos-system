import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LicenseService } from './license.service';
import type { LicenseTier } from './license.entity';

@Controller('license')
export class LicenseController {
    constructor(private readonly licenseService: LicenseService) {}

    /**
     * Verify the generator passphrase server-side.
     * No secrets exposed in client code.
     */
    @Post('verify-passphrase')
    verifyPassphrase(@Body('passphrase') passphrase?: string) {
        if (typeof passphrase !== 'string' || passphrase.length === 0) {
            throw new BadRequestException('passphrase is required');
        }
        const valid = this.licenseService.verifyGeneratorPassphrase(passphrase);
        return { valid };
    }

    /**
     * Activate a license key. Public endpoint (no auth required
     * because user hasn't activated yet).
     */
    @Post('activate')
    async activate(
        @Body('key') key: string,
        @Body('customerName') customerName?: string,
    ) {
        if (typeof key !== 'string' || key.length === 0) {
            throw new BadRequestException('key is required');
        }
        const license = await this.licenseService.activateKey(
            key,
            customerName,
        );
        return {
            message: 'License activated successfully',
            tier: license.tier,
            expiresAt: license.expiresAt,
            maxUsers: license.maxUsers,
        };
    }

    /**
     * Check license status. Public — app checks this on startup.
     */
    @Get('status')
    async status() {
        return this.licenseService.getStatus();
    }

    /**
     * Generate license keys (admin only).
     */
    @Post('generate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    generate(
        @Body('tier') tier: LicenseTier,
        @Body('durationMonths') durationMonths: number,
        @Body('count') count: number = 1,
    ) {
        const keys = this.licenseService.generateBatch(
            tier,
            durationMonths || 1,
            count || 1,
        );
        return { keys };
    }

    /**
     * Deactivate a licence key (admin only). Works whether or not the key was
     * ever activated, so a key that leaked before use can be stopped too.
     */
    @Post('revoke')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async revoke(@Body('key') key: string, @Body('reason') reason?: string) {
        await this.licenseService.revoke(key, reason);
        return { message: 'License revoked' };
    }

    /**
     * Lift a revocation (admin only). A key that never activated is released
     * outright; one that did is left expired and must be reactivated.
     */
    @Post('unrevoke')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async unrevoke(@Body('key') key: string) {
        await this.licenseService.unrevoke(key);
        return { message: 'Revocation lifted' };
    }

    /** Every key currently refused (admin only). */
    @Get('revoked')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async revoked() {
        return { revoked: await this.licenseService.listRevoked() };
    }
}
