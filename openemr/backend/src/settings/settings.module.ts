import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
    AdminSettingsController,
    SettingsPublicController,
} from './settings.controller';

/**
 * Admin-configurable application settings (feature flags).
 */
@Module({
    controllers: [SettingsPublicController, AdminSettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule {}
