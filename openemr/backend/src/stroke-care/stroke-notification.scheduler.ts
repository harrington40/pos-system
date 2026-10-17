import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { StrokeCareService } from './stroke-care.service';

/**
 * Durable stroke notification sweep.
 *
 * The database row is the delivery channel: every minute pending notifications
 * are marked delivered and unacknowledged critical notifications older than
 * five minutes are escalated. This deliberately does not depend on WebSockets —
 * a dropped browser or a sleeping phone cannot lose a safety-critical alert.
 * The same sweep is exposed to administrators for downtime recovery.
 */
@Injectable()
export class StrokeNotificationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StrokeNotificationScheduler.name);
  private timer?: NodeJS.Timeout;
  private bootTimer?: NodeJS.Timeout;
  private running = false;

  private static readonly INTERVAL_MS = 60 * 1000;

  constructor(private readonly stroke: StrokeCareService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.sweep('scheduler');
    }, StrokeNotificationScheduler.INTERVAL_MS);
    this.bootTimer = setTimeout(() => {
      void this.sweep('startup');
    }, 15 * 1000);
    this.logger.log(
      'Stroke notification sweep armed (delivery + 5-minute escalation).',
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.bootTimer) clearTimeout(this.bootTimer);
  }

  /** Run the same sweep an administrator can trigger after downtime. */
  async sweep(actor = 'scheduler') {
    if (this.running) return { ran: false, reason: 'sweep already running' };
    this.running = true;
    try {
      const result = await this.stroke.runNotificationSweep(actor);
      if (result.escalated || result.teamEscalations) {
        this.logger.warn(
          `Stroke notifications: ${result.escalated} escalated, ${result.teamEscalations} team assignments escalated.`,
        );
      }
      return { ran: true, ...result };
    } catch (error) {
      // A failed sweep must not kill the timer.
      this.logger.error(
        `Stroke notification sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { ran: false, reason: 'error' };
    } finally {
      this.running = false;
    }
  }
}
