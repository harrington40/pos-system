import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AgentModule } from './agent/agent.module';
import { CallModule } from './call/call.module';
import { QueueModule } from './queue/queue.module';
import { RoutingModule } from './routing/routing.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AgentModule,
    CallModule,
    QueueModule,
    RoutingModule,
    WebsocketModule
  ]
})
export class AppModule {}
