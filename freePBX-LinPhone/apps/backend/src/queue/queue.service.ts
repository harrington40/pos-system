import { Injectable, Logger } from '@nestjs/common';
import { OrientDBService } from '../database/orientdb.service';
import { RedisService } from '../database/redis.service';
import { QueueManager } from '@smart-sip/smart-routing';
import { Queue, RoutingStrategy } from '@smart-sip/shared';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queueManager: QueueManager;

  constructor(
    private orientDB: OrientDBService,
    private redis: RedisService
  ) {
    this.queueManager = new QueueManager();
  }

  async createQueue(queueData: Partial<Queue>): Promise<Queue> {
    try {
      const queue = await this.orientDB.createVertex('Queue', {
        name: queueData.name,
        extension: queueData.extension,
        priority: queueData.priority || 1,
        maxWaitTime: queueData.maxWaitTime || 300,
        strategy: queueData.strategy || RoutingStrategy.LEAST_BUSY,
        metadata: JSON.stringify(queueData.metadata || {})
      });

      const formattedQueue: Queue = {
        id: queue['@rid'],
        name: queue.name,
        extension: queue.extension,
        priority: queue.priority,
        maxWaitTime: queue.maxWaitTime,
        agents: [],
        waitingCalls: [],
        strategy: queue.strategy as RoutingStrategy,
        metadata: queue.metadata ? JSON.parse(queue.metadata) : {}
      };

      this.queueManager.addQueue(formattedQueue);

      this.logger.log(`Created queue: ${formattedQueue.id}`);
      return formattedQueue;
    } catch (error) {
      this.logger.error('Failed to create queue', error);
      throw error;
    }
  }

  async getAllQueues(): Promise<Queue[]> {
    return this.queueManager.getAllQueues();
  }

  async getQueueById(queueId: string): Promise<Queue | undefined> {
    return this.queueManager.getQueue(queueId);
  }

  async addCallToQueue(
    queueId: string,
    callId: string,
    priority: number = 1
  ): Promise<boolean> {
    const success = this.queueManager.addCallToQueue(queueId, callId, priority);
    
    if (success) {
      // Also add to Redis for persistence
      await this.redis.addToQueue(queueId, callId, priority);
      this.logger.log(`Added call ${callId} to queue ${queueId}`);
    }
    
    return success;
  }

  async removeCallFromQueue(queueId: string, callId: string): Promise<boolean> {
    const success = this.queueManager.removeCallFromQueue(queueId, callId);
    
    if (success) {
      await this.redis.removeFromQueue(queueId, callId);
      this.logger.log(`Removed call ${callId} from queue ${queueId}`);
    }
    
    return success;
  }

  async getNextCall(queueId: string): Promise<string | null> {
    return this.queueManager.getNextCall(queueId);
  }

  async getQueueStats(queueId: string) {
    return this.queueManager.getQueueStats(queueId);
  }

  async addAgentsToQueue(queueId: string, agentIds: string[]): Promise<boolean> {
    return this.queueManager.addAgentsToQueue(queueId, agentIds);
  }

  async removeAgentsFromQueue(queueId: string, agentIds: string[]): Promise<boolean> {
    return this.queueManager.removeAgentsFromQueue(queueId, agentIds);
  }
}
