import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // KeyDB is a high-performance Redis fork, fully compatible with Redis protocol
      this.client = createClient({
        socket: {
          host: this.configService.get('KEYDB_HOST', 'localhost'),
          port: this.configService.get('KEYDB_PORT', 6379)
        },
        password: this.configService.get('KEYDB_PASSWORD') || undefined
      });

      this.client.on('error', (err) => {
        this.logger.error('KeyDB Client Error', err);
      });

      await this.client.connect();
      this.logger.log('Connected to KeyDB');
    } catch (error) {
      this.logger.error('Failed to connect to KeyDB', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from KeyDB');
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    return this.client.hSet(key, field, value);
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    return this.client.hGet(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  async hDel(key: string, field: string): Promise<number> {
    return this.client.hDel(key, field);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return this.client.expire(key, seconds);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  // Call state management
  async setCallState(callId: string, state: any): Promise<void> {
    await this.set(`call:${callId}`, JSON.stringify(state), 3600); // 1 hour TTL
  }

  async getCallState(callId: string): Promise<any | null> {
    const data = await this.get(`call:${callId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCallState(callId: string): Promise<void> {
    await this.del(`call:${callId}`);
  }

  // Agent state management
  async setAgentState(agentId: string, state: any): Promise<void> {
    await this.hSet('agents', agentId, JSON.stringify(state));
  }

  async getAgentState(agentId: string): Promise<any | null> {
    const data = await this.hGet('agents', agentId);
    return data ? JSON.parse(data) : null;
  }

  async getAllAgentStates(): Promise<Record<string, any>> {
    const data = await this.hGetAll('agents');
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      result[key] = JSON.parse(value);
    }
    
    return result;
  }

  // Queue state management
  async addToQueue(queueId: string, callId: string, priority: number = 1): Promise<void> {
    await this.client.zAdd(`queue:${queueId}`, { score: priority, value: callId });
  }

  async removeFromQueue(queueId: string, callId: string): Promise<void> {
    await this.client.zRem(`queue:${queueId}`, callId);
  }

  async getQueueCalls(queueId: string): Promise<string[]> {
    return this.client.zRange(`queue:${queueId}`, 0, -1);
  }

  async getQueueLength(queueId: string): Promise<number> {
    return this.client.zCard(`queue:${queueId}`);
  }
}
