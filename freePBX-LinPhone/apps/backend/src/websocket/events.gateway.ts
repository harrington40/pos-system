import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CallService } from '../call/call.service';
import { AgentService } from '../agent/agent.service';
import { WSMessageType, CallState, AgentStatus } from '@smart-sip/shared';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private agentSockets: Map<string, string> = new Map(); // agentId -> socketId

  constructor(
    private callService: CallService,
    private agentService: AgentService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Find and update agent status if applicable
    for (const [agentId, socketId] of this.agentSockets.entries()) {
      if (socketId === client.id) {
        this.agentService.updateAgentStatus(agentId, AgentStatus.OFFLINE);
        this.agentSockets.delete(agentId);
        break;
      }
    }
  }

  @SubscribeMessage(WSMessageType.REGISTER)
  async handleRegister(
    @MessageBody() data: { agentId: string; type: 'agent' | 'supervisor' },
    @ConnectedSocket() client: Socket
  ) {
    this.logger.log(`Agent ${data.agentId} registered`);
    
    if (data.type === 'agent') {
      this.agentSockets.set(data.agentId, client.id);
      await this.agentService.updateAgentStatus(data.agentId, AgentStatus.AVAILABLE);
    }
    
    return { success: true, message: 'Registered successfully' };
  }

  @SubscribeMessage(WSMessageType.AGENT_STATUS_UPDATE)
  async handleAgentStatusUpdate(
    @MessageBody() data: { agentId: string; status: AgentStatus },
    @ConnectedSocket() client: Socket
  ) {
    await this.agentService.updateAgentStatus(data.agentId, data.status);
    
    // Broadcast to all clients
    this.server.emit(WSMessageType.AGENT_STATUS, {
      agentId: data.agentId,
      status: data.status,
      timestamp: new Date()
    });
    
    return { success: true };
  }

  @SubscribeMessage(WSMessageType.CALL_UPDATE)
  async handleCallUpdate(
    @MessageBody() data: { callId: string; state: CallState },
    @ConnectedSocket() client: Socket
  ) {
    await this.callService.updateCallState(data.callId, data.state);
    
    // Broadcast call event
    this.server.emit(WSMessageType.CALL_EVENT, {
      callId: data.callId,
      state: data.state,
      timestamp: new Date()
    });
    
    return { success: true };
  }

  // Server-side methods to emit events

  notifyIncomingCall(agentId: string, callData: any) {
    const socketId = this.agentSockets.get(agentId);
    if (socketId) {
      this.server.to(socketId).emit('call:incoming', callData);
      this.logger.log(`Notified agent ${agentId} of incoming call`);
    }
  }

  notifyCallAnswered(callId: string, agentId: string) {
    this.server.emit('call:answered', {
      callId,
      agentId,
      timestamp: new Date()
    });
  }

  notifyCallEnded(callId: string) {
    this.server.emit('call:ended', {
      callId,
      timestamp: new Date()
    });
  }

  notifyQueueUpdate(queueId: string, stats: any) {
    this.server.emit(WSMessageType.QUEUE_UPDATE, {
      queueId,
      stats,
      timestamp: new Date()
    });
  }

  broadcastSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.server.emit(WSMessageType.SYSTEM_NOTIFICATION, {
      message,
      type,
      timestamp: new Date()
    });
  }
}
