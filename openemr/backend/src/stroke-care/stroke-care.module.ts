import { Module } from '@nestjs/common';
import { StrokeCareController } from './stroke-care.controller';
import { StrokeCareService } from './stroke-care.service';
import { StrokeNotificationScheduler } from './stroke-notification.scheduler';

/**
 * OpenRx Stroke Care.
 *
 * Kept as its own module so a facility can enable the workflow without the
 * rest of the clinical modules changing. It depends on the shared DataSource
 * only — patients, encounters, imaging and auth stay where they already live.
 */
@Module({
  controllers: [StrokeCareController],
  providers: [StrokeCareService, StrokeNotificationScheduler],
  exports: [StrokeCareService],
})
export class StrokeCareModule {}
