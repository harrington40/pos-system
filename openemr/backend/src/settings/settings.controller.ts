import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SettingsService } from './settings.service';

/**
 * Unauthenticated feature flags for the public site (booking page, portals).
 * Only settings explicitly marked `public` are exposed.
 */
@Controller('settings')
export class SettingsPublicController {
    constructor(private readonly settings: SettingsService) {}

    @Get('public')
    getPublic() {
        return this.settings.getPublic();
    }
}

/** Administrators read and change application settings here. */
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSettingsController {
    constructor(private readonly settings: SettingsService) {}

    @Get()
    list() {
        return this.settings.describe();
    }

    @Put()
    update(@Body() patch: Record<string, unknown>) {
        return this.settings.update(patch);
    }
}
