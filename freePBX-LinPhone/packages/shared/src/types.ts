// Call Status Types
export enum CallStatus {
  IDLE = 'idle',
  RINGING = 'ringing',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  HOLD = 'hold',
  TRANSFERRING = 'transferring',
  ENDED = 'ended',
  FAILED = 'failed'
}

// Alias for backward compatibility
export const CallState = CallStatus;
export type CallState = CallStatus;

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

// Call Interface
export interface Call {
  id: string;
  sessionId: string;
  from: string;
  to: string;
  direction: CallDirection;
  status: CallStatus;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration?: number;
  agentId?: string;
  queueId?: string;
  metadata?: Record<string, any>;
}

// Agent Types
export enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ON_BREAK = 'on_break',
  OFFLINE = 'offline',
  IN_CALL = 'in_call'
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  sipUri: string;
  status: AgentStatus;
  skills: string[];
  maxConcurrentCalls: number;
  currentCalls: number;
  availabilityScore: number;
  lastCallTime?: Date;
  totalCallsToday: number;
}

// Queue Types
export interface Queue {
  id: string;
  name: string;
  description?: string;
  priority: number;
  maxWaitTime: number; // seconds
  requiredSkills: string[];
  agents: string[]; // agent IDs
  waitingCalls: QueuedCall[];
}

export interface QueuedCall {
  callId: string;
  priority: number;
  enteredAt: Date;
  estimatedWaitTime: number;
  metadata?: Record<string, any>;
}

// Routing Types
export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  enabled: boolean;
}

export interface RoutingCondition {
  type: 'time' | 'skill' | 'caller' | 'queue_length' | 'agent_availability';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
}

export interface RoutingAction {
  type: 'route_to_queue' | 'route_to_agent' | 'play_message' | 'voicemail' | 'forward';
  target: string;
  metadata?: Record<string, any>;
}

// Routing Score
export interface RoutingScore {
  agentId: string;
  score: number;
  factors: {
    availability: number;
    skillMatch: number;
    recentLoad: number;
    priority: number;
  };
}

// SIP Configuration
export interface SipConfig {
  uri: string;
  wsServer: string;
  username: string;
  password: string;
  displayName?: string;
  stunServers?: string[];
  turnServers?: TurnServer[];
}

export interface TurnServer {
  urls: string[];
  username: string;
  credential: string;
}

// WebSocket Events
export enum WSEvent {
  CALL_INCOMING = 'call:incoming',
  CALL_ANSWERED = 'call:answered',
  CALL_ENDED = 'call:ended',
  CALL_HOLD = 'call:hold',
  CALL_UNHOLD = 'call:unhold',
  CALL_TRANSFER = 'call:transfer',
  AGENT_STATUS_CHANGE = 'agent:status_change',
  QUEUE_UPDATE = 'queue:update'
}

export interface WSMessage<T = any> {
  event: WSEvent;
  data: T;
  timestamp: Date;
}

// Analytics
export interface CallAnalytics {
  callId: string;
  duration: number;
  waitTime: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string[];
  tags?: string[];
  transcription?: string;
}

// AI Features
export interface AIAnalysis {
  intent: string[];
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'neutral' | 'negative';
  };
  keywords: string[];
  suggestedActions: string[];
  escalationProbability: number; // 0 to 1
}

// Error Types
export class SipError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SipError';
  }
}

export class RoutingError extends Error {
  constructor(
    message: string,
    public reason: string,
    public context?: any
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}
