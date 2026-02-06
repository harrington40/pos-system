import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrientDBService } from '../database/orientdb.service';
import { RedisService } from '../database/redis.service';
import { Agent, AgentStatus, Skill } from '@smart-sip/shared';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private orientDB: OrientDBService,
    private redis: RedisService
  ) {}

  async createAgent(agentData: Partial<Agent>): Promise<Agent> {
    try {
      const agent = await this.orientDB.createVertex('Agent', {
        name: agentData.name,
        email: agentData.email,
        sipExtension: agentData.sipExtension,
        status: AgentStatus.OFFLINE,
        currentLoad: 0,
        maxConcurrentCalls: agentData.maxConcurrentCalls || 1,
        totalCalls: 0,
        averageHandleTime: 0,
        availability: 1.0,
        metadata: JSON.stringify(agentData.metadata || {}),
        createdAt: new Date().toISOString()
      });

      // Create skills if provided
      if (agentData.skills && agentData.skills.length > 0) {
        for (const skill of agentData.skills) {
          await this.addSkillToAgent(agent['@rid'], skill);
        }
      }

      // Cache in Redis
      await this.redis.setAgentState(agent['@rid'], {
        ...agent,
        skills: agentData.skills || []
      });

      this.logger.log(`Created agent: ${agent['@rid']}`);
      return this.formatAgent(agent, agentData.skills || []);
    } catch (error) {
      this.logger.error('Failed to create agent', error);
      throw error;
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    try {
      const query = `
        SELECT *, 
          out('HasSkill') as skills 
        FROM Agent
      `;
      const result = await this.orientDB.query(query);
      
      return result.map((agent: any) => this.formatAgent(agent, agent.skills || []));
    } catch (error) {
      this.logger.error('Failed to get agents', error);
      throw error;
    }
  }

  async getAgentById(agentId: string): Promise<Agent> {
    try {
      const query = `
        SELECT *, 
          out('HasSkill') as skills 
        FROM ${agentId}
      `;
      const result = await this.orientDB.query(query);
      
      if (result.length === 0) {
        throw new NotFoundException(`Agent ${agentId} not found`);
      }

      return this.formatAgent(result[0], result[0].skills || []);
    } catch (error) {
      this.logger.error(`Failed to get agent ${agentId}`, error);
      throw error;
    }
  }

  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<Agent> {
    try {
      await this.orientDB.update('Agent', { status }, { '@rid': agentId });
      
      // Update cache
      const agentState = await this.redis.getAgentState(agentId);
      if (agentState) {
        agentState.status = status;
        await this.redis.setAgentState(agentId, agentState);
      }

      this.logger.log(`Updated agent ${agentId} status to ${status}`);
      return this.getAgentById(agentId);
    } catch (error) {
      this.logger.error(`Failed to update agent status`, error);
      throw error;
    }
  }

  async updateAgentLoad(agentId: string, currentLoad: number): Promise<void> {
    try {
      await this.orientDB.update('Agent', { currentLoad }, { '@rid': agentId });
      
      // Update cache
      const agentState = await this.redis.getAgentState(agentId);
      if (agentState) {
        agentState.currentLoad = currentLoad;
        await this.redis.setAgentState(agentId, agentState);
      }
    } catch (error) {
      this.logger.error(`Failed to update agent load`, error);
      throw error;
    }
  }

  async addSkillToAgent(agentId: string, skill: Skill): Promise<void> {
    try {
      // Create or get skill vertex
      const skillQuery = `
        SELECT FROM Skill 
        WHERE name = '${skill.name}' AND category = '${skill.category}'
      `;
      let skillVertex = await this.orientDB.query(skillQuery);

      if (skillVertex.length === 0) {
        skillVertex = [await this.orientDB.createVertex('Skill', {
          name: skill.name,
          category: skill.category
        })];
      }

      // Create edge
      await this.orientDB.createEdge(
        'HasSkill',
        agentId,
        skillVertex[0]['@rid'],
        { level: skill.level }
      );

      this.logger.log(`Added skill ${skill.name} to agent ${agentId}`);
    } catch (error) {
      this.logger.error('Failed to add skill to agent', error);
      throw error;
    }
  }

  async getAvailableAgents(): Promise<Agent[]> {
    try {
      // First check Redis cache
      const cachedAgents = await this.redis.getAllAgentStates();
      
      if (Object.keys(cachedAgents).length > 0) {
        return Object.values(cachedAgents).filter(
          (agent: any) => 
            agent.status === AgentStatus.AVAILABLE && 
            agent.currentLoad < agent.maxConcurrentCalls
        );
      }

      // Fallback to database
      const query = `
        SELECT *, out('HasSkill') as skills 
        FROM Agent 
        WHERE status = '${AgentStatus.AVAILABLE}' 
        AND currentLoad < maxConcurrentCalls
      `;
      const result = await this.orientDB.query(query);
      
      return result.map((agent: any) => this.formatAgent(agent, agent.skills || []));
    } catch (error) {
      this.logger.error('Failed to get available agents', error);
      throw error;
    }
  }

  async incrementCallCount(agentId: string): Promise<void> {
    try {
      await this.orientDB.execute(`
        UPDATE ${agentId} 
        SET totalCalls = totalCalls + 1
      `);
    } catch (error) {
      this.logger.error('Failed to increment call count', error);
    }
  }

  private formatAgent(dbAgent: any, skills: any[]): Agent {
    return {
      id: dbAgent['@rid'],
      name: dbAgent.name,
      email: dbAgent.email,
      sipExtension: dbAgent.sipExtension,
      status: dbAgent.status as AgentStatus,
      skills: skills.map((skill: any) => ({
        id: skill['@rid'],
        name: skill.name,
        category: skill.category,
        level: skill.level || 5
      })),
      currentLoad: dbAgent.currentLoad || 0,
      maxConcurrentCalls: dbAgent.maxConcurrentCalls || 1,
      totalCalls: dbAgent.totalCalls || 0,
      averageHandleTime: dbAgent.averageHandleTime || 0,
      availability: dbAgent.availability || 1.0,
      metadata: dbAgent.metadata ? JSON.parse(dbAgent.metadata) : {}
    };
  }
}
