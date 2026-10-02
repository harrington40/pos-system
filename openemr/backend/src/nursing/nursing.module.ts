import { Module } from '@nestjs/common';
import { NursingController } from './nursing.controller';
import { NursingService } from './nursing.service';
import { SmartRoutingService } from './smart-routing.service';
import { RnWorkbenchService } from './rn-workbench.service';
import { MedicationAdministrationModule } from '../medication-administration/medication-administration.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
    // The RN workspace embeds the medication-administration board, so it reads
    // that service directly rather than re-implementing the MAR queries. It also
    // pages escalations through the shared messaging pipeline (MessagingModule).
    imports: [MedicationAdministrationModule, MessagingModule],
    controllers: [NursingController],
    providers: [NursingService, SmartRoutingService, RnWorkbenchService],
    exports: [SmartRoutingService],
})
export class NursingModule {}
