import { Injectable, Logger } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { SmartRoutingEngine } from '@smart-sip/smart-routing';
import { Agent, Skill, RoutingScore } from '@smart-sip/shared';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private routingEngine: SmartRoutingEngine;

  constructor(private agentService: AgentService) {
    this.routingEngine = new SmartRoutingEngine();
  }

  async findBestAgent(
    requiredSkills: Skill[] = [],
    priority: number = 1
  ): Promise<Agent | null> {
    try {
      const availableAgents = await this.agentService.getAvailableAgents();
      
      if (availableAgents.length === 0) {
        this.logger.warn('No available agents found');
        return null;
      }

      const bestAgent = this.routingEngine.findBestAgent(
        availableAgents,
        requiredSkills,
        priority
      );

      if (bestAgent) {
        this.logger.log(`Routed call to agent ${bestAgent.id}`);
      }

      return bestAgent;
    } catch (error) {
      this.logger.error('Failed to find best agent', error);
      throw error;
    }
  }

  async calculateRoutingScores(
    requiredSkills: Skill[] = [],
    priority: number = 1
  ): Promise<RoutingScore[]> {
    try {
      const availableAgents = await this.agentService.getAvailableAgents();
      
      return availableAgents.map(agent =>
        this.routingEngine.calculateAgentScore(agent, requiredSkills, priority)
      ).sort((a, b) => b.score - a.score);
    } catch (error) {
      this.logger.error('Failed to calculate routing scores', error);
      throw error;
    }
  }

  async skillBasedRouting(
    requiredSkills: Skill[],
    allowPartialMatch: boolean = true
  ): Promise<Agent | null> {
    try {
      const availableAgents = await this.agentService.getAvailableAgents();
      
      return this.routingEngine.skillBasedRouting(
        availableAgents,
        requiredSkills,
        allowPartialMatch
      );
    } catch (error) {
      this.logger.error('Failed skill-based routing', error);
      throw error;
    }
  }

  async priorityRouting(
    priority: number,
    requiredSkills: Skill[] = []
  ): Promise<Agent | null> {
    try {
      const availableAgents = await this.agentService.getAvailableAgents();
      
      return this.routingEngine.priorityRouting(
        availableAgents,
        priority,
        requiredSkills
      );
    } catch (error) {
      this.logger.error('Failed priority routing', error);
      throw error;
    }
  }

  updateRoutingWeights(weights: {
    availability?: number;
    skillMatch?: number;
    loadBalance?: number;
    priority?: number;
  }): void {
    this.routingEngine.updateWeights(weights);
    this.logger.log('Updated routing weights', weights);
  }

  getRoutingWeights() {
    return this.routingEngine.getWeights();
  }
}
