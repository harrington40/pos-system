import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DbAdminController } from './db-admin.controller';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [forwardRef(() => MessagingModule)],
  controllers: [AdminController, DbAdminController],
  providers: [AdminService],
})
export class AdminModule {}
