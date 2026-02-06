import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { Agent, Skill, RoutingScore } from '@smart-sip/shared';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('find-agent')
  async findBestAgent(
    @Body('requiredSkills') requiredSkills: Skill[] = [],
    @Body('priority') priority: number = 1
  ): Promise<Agent | null> {
    return this.routingService.findBestAgent(requiredSkills, priority);
  }

  @Post('scores')
  async getRoutingScores(
    @Body('requiredSkills') requiredSkills: Skill[] = [],
    @Body('priority') priority: number = 1
  ): Promise<RoutingScore[]> {
    return this.routingService.calculateRoutingScores(requiredSkills, priority);
  }

  @Post('skill-based')
  async skillBasedRouting(
    @Body('requiredSkills') requiredSkills: Skill[],
    @Body('allowPartialMatch') allowPartialMatch: boolean = true
  ): Promise<Agent | null> {
    return this.routingService.skillBasedRouting(requiredSkills, allowPartialMatch);
  }

  @Post('priority')
  async priorityRouting(
    @Body('priority') priority: number,
    @Body('requiredSkills') requiredSkills: Skill[] = []
  ): Promise<Agent | null> {
    return this.routingService.priorityRouting(priority, requiredSkills);
  }

  @Get('weights')
  getWeights() {
    return this.routingService.getRoutingWeights();
  }

  @Post('weights')
  updateWeights(@Body() weights: any) {
    this.routingService.updateRoutingWeights(weights);
    return { message: 'Weights updated successfully' };
  }
}
