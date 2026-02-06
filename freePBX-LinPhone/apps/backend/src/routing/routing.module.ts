import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

@Module({
  imports: [AgentModule],
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService]
})
export class RoutingModule {}
