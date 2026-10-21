import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
    AdminSettingsController,
    SettingsPublicController,
} from './settings.controller';

/**
 * Admin-configurable application settings (feature flags).
 *
 * Global so the roles guard can resolve `SettingsService` in every module that
 * uses `@UseGuards(..., RolesGuard)` without each module importing this one.
 */
@Global()
@Module({
    controllers: [SettingsPublicController, AdminSettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule {}
