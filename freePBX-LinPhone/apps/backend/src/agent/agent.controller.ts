import { Controller, Get, Post, Put, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AgentService } from './agent.service';
import { Agent, AgentStatus, Skill } from '@smart-sip/shared';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAgent(@Body() agentData: Partial<Agent>): Promise<Agent> {
    return this.agentService.createAgent(agentData);
  }

  @Get()
  async getAllAgents(): Promise<Agent[]> {
    return this.agentService.getAllAgents();
  }

  @Get('available')
  async getAvailableAgents(): Promise<Agent[]> {
    return this.agentService.getAvailableAgents();
  }

  @Get(':id')
  async getAgentById(@Param('id') id: string): Promise<Agent> {
    return this.agentService.getAgentById(id);
  }

  @Put(':id/status')
  async updateAgentStatus(
    @Param('id') id: string,
    @Body('status') status: AgentStatus
  ): Promise<Agent> {
    return this.agentService.updateAgentStatus(id, status);
  }

  @Post(':id/skills')
  async addSkill(
    @Param('id') id: string,
    @Body() skill: Skill
  ): Promise<void> {
    return this.agentService.addSkillToAgent(id, skill);
  }
}
