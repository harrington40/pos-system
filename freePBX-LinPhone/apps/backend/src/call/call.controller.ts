import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { CallService } from './call.service';
import { Call, CallState } from '@smart-sip/shared';

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post()
  async createCall(@Body() callData: Partial<Call>): Promise<Call> {
    return this.callService.createCall(callData);
  }

  @Get()
  async getCalls(@Query('active') active?: string): Promise<Call[]> {
    if (active === 'true') {
      return this.callService.getActiveCalls();
    }
    return this.callService.getCallHistory();
  }

  @Get(':id')
  async getCallById(@Param('id') id: string): Promise<Call | null> {
    return this.callService.getCallById(id);
  }

  @Put(':id/state')
  async updateCallState(
    @Param('id') id: string,
    @Body('state') state: CallState
  ): Promise<void> {
    return this.callService.updateCallState(id, state);
  }

  @Post(':id/assign')
  async assignToAgent(
    @Param('id') id: string,
    @Body('agentId') agentId: string
  ): Promise<void> {
    return this.callService.assignCallToAgent(id, agentId);
  }

  @Delete(':id')
  async deleteCall(@Param('id') id: string): Promise<void> {
    return this.callService.deleteCall(id);
  }
}
