import { Agent, Skill, Queue, RoutingScore, AgentStatus } from '@smart-sip/shared';
import { weightedAverage, normalizeScore, isBusinessHours } from '@smart-sip/shared';

/**
 * Smart Routing Engine
 * 
 * Implements intelligent call routing algorithms:
 * - Availability scoring
 * - Skill-based matching
 * - Load balancing
 * - Time-of-day rules
 */
export class SmartRoutingEngine {
  
  // Configurable weights for routing algorithm
  private weights = {
    availability: 0.4,
    skillMatch: 0.3,
    loadBalance: 0.2,
    priority: 0.1
  };

  constructor(weights?: Partial<typeof SmartRoutingEngine.prototype.weights>) {
    if (weights) {
      this.weights = { ...this.weights, ...weights };
    }
  }

  /**
   * Find the best agent for a call based on multiple factors
   */
  findBestAgent(
    agents: Agent[],
    requiredSkills: Skill[] = [],
    priority: number = 1,
    considerBusinessHours: boolean = true
  ): Agent | null {
    // Filter available agents
    const availableAgents = agents.filter(agent => 
      agent.status === AgentStatus.AVAILABLE && 
      agent.currentLoad < agent.maxConcurrentCalls
    );

    if (availableAgents.length === 0) {
      return null;
    }

    // Calculate scores for each agent
    const scores = availableAgents.map(agent => 
      this.calculateAgentScore(agent, requiredSkills, priority)
    );

    // Find agent with highest score
    const bestScore = scores.reduce((max, score) => 
      score.score > max.score ? score : max
    );

    return availableAgents.find(agent => agent.id === bestScore.agentId) || null;
  }

  /**
   * Calculate routing score for an agent
   */
  calculateAgentScore(
    agent: Agent,
    requiredSkills: Skill[] = [],
    priority: number = 1
  ): RoutingScore {
    // 1. Availability Score (0-1)
    const availabilityScore = this.calculateAvailabilityScore(agent);

    // 2. Skill Match Score (0-1)
    const skillMatchScore = this.calculateSkillMatchScore(agent.skills, requiredSkills);

    // 3. Load Balance Score (0-1) - lower load is better
    const loadScore = this.calculateLoadScore(agent);

    // 4. Priority Score (0-1)
    const priorityScore = normalizeScore(priority, 1, 10);

    // Calculate weighted average
    const totalScore = weightedAverage(
      [availabilityScore, skillMatchScore, loadScore, priorityScore],
      [this.weights.availability, this.weights.skillMatch, this.weights.loadBalance, this.weights.priority]
    );

    return {
      agentId: agent.id,
      score: totalScore,
      breakdown: {
        availability: availabilityScore,
        skillMatch: skillMatchScore,
        loadBalance: loadScore,
        priority: priorityScore
      }
    };
  }

  /**
   * Calculate availability score
   * Based on agent status and current load
   */
  private calculateAvailabilityScore(agent: Agent): number {
    if (agent.status !== AgentStatus.AVAILABLE) {
      return 0;
    }

    // Calculate capacity: how much room they have for more calls
    const capacity = 1 - (agent.currentLoad / agent.maxConcurrentCalls);
    
    // Consider availability score from agent profile
    const agentAvailability = agent.availability || 1;

    return capacity * agentAvailability;
  }

  /**
   * Calculate skill match score
   * Compares required skills with agent skills
   */
  private calculateSkillMatchScore(agentSkills: Skill[], requiredSkills: Skill[]): number {
    if (requiredSkills.length === 0) {
      return 1; // No specific skills required
    }

    let totalMatch = 0;
    let matchedSkills = 0;

    for (const requiredSkill of requiredSkills) {
      const agentSkill = agentSkills.find(
        s => s.name.toLowerCase() === requiredSkill.name.toLowerCase() 
          && s.category === requiredSkill.category
      );

      if (agentSkill) {
        matchedSkills++;
        // Skill level match (0-1)
        const levelMatch = Math.min(agentSkill.level / requiredSkill.level, 1);
        totalMatch += levelMatch;
      }
    }

    if (matchedSkills === 0) {
      return 0; // No matching skills
    }

    return totalMatch / requiredSkills.length;
  }

  /**
   * Calculate load balance score
   * Agents with lower current load get higher scores
   */
  private calculateLoadScore(agent: Agent): number {
    if (agent.maxConcurrentCalls === 0) {
      return 0;
    }

    // Inverse of load percentage
    const loadPercent = agent.currentLoad / agent.maxConcurrentCalls;
    return 1 - loadPercent;
  }

  /**
   * Distribute calls across multiple agents (Round Robin with scoring)
   */
  roundRobinWithScore(
    agents: Agent[],
    requiredSkills: Skill[] = []
  ): Agent[] {
    const availableAgents = agents.filter(agent => 
      agent.status === AgentStatus.AVAILABLE && 
      agent.currentLoad < agent.maxConcurrentCalls
    );

    // Calculate scores
    const scored = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, requiredSkills, 1).score
    }));

    // Sort by score (highest first) then by totalCallsToday (lowest first)
    return scored
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) < 0.1) {
          // If scores are similar, prefer agent with fewer calls today
          return a.agent.totalCallsToday - b.agent.totalCallsToday;
        }
        return b.score - a.score;
      })
      .map(item => item.agent);
  }

  /**
   * Skill-based routing with fallback
   */
  skillBasedRouting(
    agents: Agent[],
    requiredSkills: Skill[],
    allowPartialMatch: boolean = true
  ): Agent | null {
    // First try: exact skill match
    const exactMatches = agents.filter(agent => 
      this.hasAllSkills(agent.skills, requiredSkills)
    );

    if (exactMatches.length > 0) {
      return this.findBestAgent(exactMatches, requiredSkills, 1, false);
    }

    // Second try: partial match if allowed
    if (allowPartialMatch) {
      const partialMatches = agents.filter(agent => 
        this.hasAnySkill(agent.skills, requiredSkills)
      );

      if (partialMatches.length > 0) {
        return this.findBestAgent(partialMatches, requiredSkills, 1, false);
      }
    }

    // Fallback: any available agent
    return this.findBestAgent(agents, [], 1, false);
  }

  /**
   * Check if agent has all required skills
   */
  private hasAllSkills(agentSkills: Skill[], requiredSkills: Skill[]): boolean {
    return requiredSkills.every(required =>
      agentSkills.some(agent =>
        agent.name.toLowerCase() === required.name.toLowerCase() &&
        agent.level >= required.level
      )
    );
  }

  /**
   * Check if agent has any of the required skills
   */
  private hasAnySkill(agentSkills: Skill[], requiredSkills: Skill[]): boolean {
    return requiredSkills.some(required =>
      agentSkills.some(agent =>
        agent.name.toLowerCase() === required.name.toLowerCase()
      )
    );
  }

  /**
   * Priority-based routing
   * VIP or emergency calls get routed to best available agents
   */
  priorityRouting(
    agents: Agent[],
    priority: number, // 1-10, higher = more important
    requiredSkills: Skill[] = []
  ): Agent | null {
    if (priority >= 8) {
      // High priority: get absolute best agent
      const scores = agents
        .filter(agent => 
          agent.status === AgentStatus.AVAILABLE && 
          agent.currentLoad < agent.maxConcurrentCalls
        )
        .map(agent => this.calculateAgentScore(agent, requiredSkills, priority));

      if (scores.length === 0) {
        return null;
      }

      const bestScore = scores.reduce((max, score) => 
        score.score > max.score ? score : max
      );

      return agents.find(agent => agent.id === bestScore.agentId) || null;
    }

    // Normal priority: use standard routing
    return this.findBestAgent(agents, requiredSkills, priority);
  }

  /**
   * Time-based routing
   * Route calls differently based on time of day
   */
  timeBasedRouting(
    agents: Agent[],
    queue: Queue,
    date: Date = new Date()
  ): Agent | null {
    const hour = date.getHours();
    const isBusinessHour = isBusinessHours(date);

    if (!isBusinessHour) {
      // After hours: route to on-call agents only
      const onCallAgents = agents.filter(agent => 
        agent.metadata?.onCall === true
      );
      
      if (onCallAgents.length > 0) {
        return this.findBestAgent(onCallAgents, queue.requiredSkills || []);
      }
      
      return null; // Send to voicemail
    }

    // Business hours: normal routing
    const queueAgents = agents.filter(agent => 
      queue.agents.includes(agent.id)
    );

    return this.findBestAgent(queueAgents, queue.requiredSkills || [], queue.priority);
  }

  /**
   * Predictive routing based on call patterns
   */
  predictiveRouting(
    agents: Agent[],
    callMetadata: Record<string, any>,
    requiredSkills: Skill[] = []
  ): Agent | null {
    // Simple predictive logic based on caller history
    const callerHistory = callMetadata.previousCallCount || 0;
    const lastAgentId = callMetadata.lastAgentId;

    // If caller has history with specific agent, try to route there
    if (callerHistory > 0 && lastAgentId) {
      const previousAgent = agents.find(agent => 
        agent.id === lastAgentId &&
        agent.status === AgentStatus.AVAILABLE &&
        agent.currentLoad < agent.maxConcurrentCalls
      );

      if (previousAgent) {
        return previousAgent;
      }
    }

    // Otherwise use standard smart routing
    return this.findBestAgent(agents, requiredSkills);
  }

  /**
   * Get routing recommendations for a queue
   */
  getRoutingRecommendations(
    queue: Queue,
    agents: Agent[]
  ): RoutingScore[] {
    const queueAgents = agents.filter(agent => 
      queue.agents.includes(agent.id)
    );

    return queueAgents
      .map(agent => this.calculateAgentScore(agent, queue.requiredSkills || [], queue.priority))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Update routing weights dynamically
   */
  updateWeights(weights: Partial<typeof SmartRoutingEngine.prototype.weights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get current routing weights
   */
  getWeights(): typeof SmartRoutingEngine.prototype.weights {
    return { ...this.weights };
  }
}
