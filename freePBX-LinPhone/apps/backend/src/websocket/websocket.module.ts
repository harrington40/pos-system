import { Module } from '@nestjs/common';
import { CallModule } from '../call/call.module';
import { AgentModule } from '../agent/agent.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [CallModule, AgentModule],
  providers: [EventsGateway],
  exports: [EventsGateway]
})
export class WebsocketModule {}
