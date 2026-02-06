import { Injectable, Logger } from '@nestjs/common';
import { OrientDBService } from '../database/orientdb.service';
import { RedisService } from '../database/redis.service';
import { Call, CallState, CallDirection } from '@smart-sip/shared';
import { generateId } from '@smart-sip/shared';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    private orientDB: OrientDBService,
    private redis: RedisService
  ) {}

  async createCall(callData: Partial<Call>): Promise<Call> {
    try {
      const call = await this.orientDB.createVertex('Call', {
        id: callData.id || generateId('call'),
        from: callData.from,
        to: callData.to,
        direction: callData.direction || CallDirection.INBOUND,
        state: callData.state || CallState.RINGING,
        startTime: callData.startTime || new Date().toISOString(),
        priority: callData.priority || 1,
        metadata: JSON.stringify(callData.metadata || {})
      });

      // Cache in Redis
      await this.redis.setCallState(call.id, call);

      this.logger.log(`Created call: ${call.id}`);
      return this.formatCall(call);
    } catch (error) {
      this.logger.error('Failed to create call', error);
      throw error;
    }
  }

  async getCallById(callId: string): Promise<Call | null> {
    try {
      // First check Redis cache
      const cached = await this.redis.getCallState(callId);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const query = `SELECT FROM Call WHERE id = '${callId}'`;
      const result = await this.orientDB.query(query);
      
      if (result.length === 0) {
        return null;
      }

      return this.formatCall(result[0]);
    } catch (error) {
      this.logger.error(`Failed to get call ${callId}`, error);
      throw error;
    }
  }

  async updateCallState(callId: string, state: CallState): Promise<void> {
    try {
      await this.orientDB.execute(`
        UPDATE Call 
        SET state = '${state}',
            ${state === CallState.ENDED ? `endTime = '${new Date().toISOString()}'` : ''}
        WHERE id = '${callId}'
      `);

      // Update cache
      const call = await this.redis.getCallState(callId);
      if (call) {
        call.state = state;
        if (state === CallState.ENDED) {
          call.endTime = new Date();
          call.duration = Math.floor(
            (call.endTime.getTime() - new Date(call.startTime).getTime()) / 1000
          );
        }
        await this.redis.setCallState(callId, call);
      }

      this.logger.log(`Updated call ${callId} state to ${state}`);
    } catch (error) {
      this.logger.error('Failed to update call state', error);
      throw error;
    }
  }

  async assignCallToAgent(callId: string, agentId: string): Promise<void> {
    try {
      // Update call in database
      const callQuery = `SELECT FROM Call WHERE id = '${callId}'`;
      const callResult = await this.orientDB.query(callQuery);
      
      if (callResult.length > 0) {
        const callRid = callResult[0]['@rid'];
        
        // Create edge between Call and Agent
        await this.orientDB.createEdge('HandledBy', callRid, agentId, {
          assignedAt: new Date().toISOString()
        });

        this.logger.log(`Assigned call ${callId} to agent ${agentId}`);
      }
    } catch (error) {
      this.logger.error('Failed to assign call to agent', error);
      throw error;
    }
  }

  async getActiveCalls(): Promise<Call[]> {
    try {
      const query = `
        SELECT FROM Call 
        WHERE state IN ['${CallState.RINGING}', '${CallState.ACTIVE}', '${CallState.CONNECTING}']
        ORDER BY startTime DESC
      `;
      const result = await this.orientDB.query(query);
      
      return result.map((call: any) => this.formatCall(call));
    } catch (error) {
      this.logger.error('Failed to get active calls', error);
      throw error;
    }
  }

  async getCallHistory(limit: number = 50): Promise<Call[]> {
    try {
      const query = `
        SELECT FROM Call 
        ORDER BY startTime DESC 
        LIMIT ${limit}
      `;
      const result = await this.orientDB.query(query);
      
      return result.map((call: any) => this.formatCall(call));
    } catch (error) {
      this.logger.error('Failed to get call history', error);
      throw error;
    }
  }

  async deleteCall(callId: string): Promise<void> {
    try {
      await this.redis.deleteCallState(callId);
      await this.orientDB.execute(`DELETE FROM Call WHERE id = '${callId}'`);
      this.logger.log(`Deleted call ${callId}`);
    } catch (error) {
      this.logger.error('Failed to delete call', error);
      throw error;
    }
  }

  private formatCall(dbCall: any): Call {
    return {
      id: dbCall.id,
      from: dbCall.from,
      to: dbCall.to,
      direction: dbCall.direction as CallDirection,
      state: dbCall.state as CallState,
      startTime: new Date(dbCall.startTime),
      endTime: dbCall.endTime ? new Date(dbCall.endTime) : undefined,
      duration: dbCall.duration,
      queueTime: dbCall.queueTime,
      holdTime: dbCall.holdTime,
      recording: dbCall.recording,
      tags: dbCall.tags ? JSON.parse(dbCall.tags) : undefined,
      priority: dbCall.priority || 1,
      metadata: dbCall.metadata ? JSON.parse(dbCall.metadata) : {}
    };
  }
}
