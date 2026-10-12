import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DbAdminController } from './db-admin.controller';
import { MessagingModule } from '../messaging/messaging.module';
import { PatientPortalModule } from '../patient-portal/patient-portal.module';
import { LicenseModule } from '../license/license.module';

@Module({
    imports: [
        forwardRef(() => MessagingModule),
        PatientPortalModule,
        LicenseModule,
    ],
    controllers: [AdminController, DbAdminController],
    providers: [AdminService],
})
export class AdminModule {}
