import { Queue, Agent, CallState } from '@smart-sip/shared';

/**
 * Queue Manager
 * Handles call queuing and queue state management
 */
export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private callTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Add a queue
   */
  addQueue(queue: Queue): void {
    this.queues.set(queue.id, queue);
  }

  /**
   * Get queue by ID
   */
  getQueue(queueId: string): Queue | undefined {
    return this.queues.get(queueId);
  }

  /**
   * Get all queues
   */
  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Add call to queue
   */
  addCallToQueue(
    queueId: string,
    callId: string,
    priority: number = 1,
    metadata?: Record<string, any>
  ): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    // Calculate estimated wait time
    const estimatedWaitTime = this.calculateEstimatedWaitTime(queue);

    queue.waitingCalls.push({
      callId,
      priority,
      enteredAt: new Date(),
      estimatedWaitTime,
      metadata
    });

    // Sort by priority (highest first)
    queue.waitingCalls.sort((a, b) => b.priority - a.priority);

    // Set timeout for max wait time
    if (queue.maxWaitTime > 0) {
      const timeout = setTimeout(() => {
        this.removeCallFromQueue(queueId, callId);
        this.onMaxWaitTimeExceeded(queueId, callId);
      }, queue.maxWaitTime * 1000);

      this.callTimeouts.set(callId, timeout);
    }

    return true;
  }

  /**
   * Remove call from queue
   */
  removeCallFromQueue(queueId: string, callId: string): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    const index = queue.waitingCalls.findIndex(call => call.callId === callId);
    if (index === -1) {
      return false;
    }

    queue.waitingCalls.splice(index, 1);

    // Clear timeout
    const timeout = this.callTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(callId);
    }

    return true;
  }

  /**
   * Get next call from queue
   */
  getNextCall(queueId: string): string | null {
    const queue = this.queues.get(queueId);
    if (!queue || queue.waitingCalls.length === 0) {
      return null;
    }

    // Return highest priority call
    return queue.waitingCalls[0].callId;
  }

  /**
   * Get queue position for a call
   */
  getQueuePosition(queueId: string, callId: string): number {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return -1;
    }

    return queue.waitingCalls.findIndex(call => call.callId === callId) + 1;
  }

  /**
   * Calculate estimated wait time
   */
  private calculateEstimatedWaitTime(queue: Queue): number {
    // Simple calculation based on queue length and available agents
    const avgHandleTime = 180; // 3 minutes default
    const availableAgents = queue.agents.length;
    
    if (availableAgents === 0) {
      return queue.maxWaitTime;
    }

    const estimatedTime = (queue.waitingCalls.length * avgHandleTime) / availableAgents;
    return Math.min(estimatedTime, queue.maxWaitTime);
  }

  /**
   * Update queue statistics
   */
  updateQueueStats(queueId: string): void {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return;
    }

    // Update estimated wait times for all calls in queue
    queue.waitingCalls.forEach(call => {
      const timeInQueue = Math.floor(
        (Date.now() - call.enteredAt.getTime()) / 1000
      );
      call.estimatedWaitTime = Math.max(
        0,
        this.calculateEstimatedWaitTime(queue) - timeInQueue
      );
    });
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queueId: string) {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return null;
    }

    const waitingCount = queue.waitingCalls.length;
    const longestWait = waitingCount > 0 
      ? Math.max(...queue.waitingCalls.map(call => 
          Math.floor((Date.now() - call.enteredAt.getTime()) / 1000)
        ))
      : 0;

    const avgWaitTime = waitingCount > 0
      ? queue.waitingCalls.reduce((sum, call) => 
          sum + Math.floor((Date.now() - call.enteredAt.getTime()) / 1000), 0
        ) / waitingCount
      : 0;

    return {
      queueId: queue.id,
      queueName: queue.name,
      waitingCalls: waitingCount,
      availableAgents: queue.agents.length,
      longestWaitTime: longestWait,
      averageWaitTime: Math.floor(avgWaitTime),
      maxWaitTime: queue.maxWaitTime
    };
  }

  /**
   * Check if queue has available capacity
   */
  hasCapacity(queueId: string): boolean {
    const queue = this.queues.get(queueId);
    return queue ? queue.agents.length > 0 : false;
  }

  /**
   * Override for max wait time exceeded
   */
  protected onMaxWaitTimeExceeded(queueId: string, callId: string): void {
    // Override in subclass or set callback
    console.log(`Max wait time exceeded for call ${callId} in queue ${queueId}`);
  }

  /**
   * Add agents to queue
   */
  addAgentsToQueue(queueId: string, agentIds: string[]): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    agentIds.forEach(agentId => {
      if (!queue.agents.includes(agentId)) {
        queue.agents.push(agentId);
      }
    });

    return true;
  }

  /**
   * Remove agents from queue
   */
  removeAgentsFromQueue(queueId: string, agentIds: string[]): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    queue.agents = queue.agents.filter(id => !agentIds.includes(id));
    return true;
  }

  /**
   * Clear all queues
   */
  clearAllQueues(): void {
    // Clear all timeouts
    this.callTimeouts.forEach(timeout => clearTimeout(timeout));
    this.callTimeouts.clear();

    // Clear all queues
    this.queues.forEach(queue => {
      queue.waitingCalls = [];
    });
  }

  /**
   * Remove queue
   */
  removeQueue(queueId: string): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }

    // Remove all calls and clear timeouts
    queue.waitingCalls.forEach(call => {
      const timeout = this.callTimeouts.get(call.callId);
      if (timeout) {
        clearTimeout(timeout);
        this.callTimeouts.delete(call.callId);
      }
    });

    return this.queues.delete(queueId);
  }
}
