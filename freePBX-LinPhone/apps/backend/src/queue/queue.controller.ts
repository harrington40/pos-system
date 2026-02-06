import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { QueueService } from './queue.service';
import { Queue } from '@smart-sip/shared';

@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  async createQueue(@Body() queueData: Partial<Queue>): Promise<Queue> {
    return this.queueService.createQueue(queueData);
  }

  @Get()
  async getAllQueues(): Promise<Queue[]> {
    return this.queueService.getAllQueues();
  }

  @Get(':id')
  async getQueue(@Param('id') id: string): Promise<Queue | undefined> {
    return this.queueService.getQueueById(id);
  }

  @Get(':id/stats')
  async getQueueStats(@Param('id') id: string) {
    return this.queueService.getQueueStats(id);
  }

  @Post(':id/calls')
  async addCallToQueue(
    @Param('id') id: string,
    @Body('callId') callId: string,
    @Body('priority') priority: number = 1
  ): Promise<{ success: boolean }> {
    const success = await this.queueService.addCallToQueue(id, callId, priority);
    return { success };
  }

  @Post(':id/agents')
  async addAgents(
    @Param('id') id: string,
    @Body('agentIds') agentIds: string[]
  ): Promise<{ success: boolean }> {
    const success = await this.queueService.addAgentsToQueue(id, agentIds);
    return { success };
  }
}
