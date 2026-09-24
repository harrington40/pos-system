import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LabReportsService } from './labreports.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabReportsController {
  constructor(private readonly labReports: LabReportsService) {}

  // ── Database-driven test catalog ─────────────────────────────────
  @Get('lab/catalog')
  @Roles('admin', 'physician', 'nurse', 'lab_tech')
  getCatalog(@Query('category') category?: string) {
    return this.labReports.getCatalog(category);
  }

  // ── Ordered tests for a patient ──────────────────────────────────
  @Get('patients/:pid/lab/ordered-tests')
  @Roles('admin', 'physician', 'nurse', 'lab_tech')
  getOrderedTests(@Param('pid') pid: string) {
    return this.labReports.getOrderedTestNames(+pid);
  }

  // ── Reports ──────────────────────────────────────────────────────
  @Get('patients/:pid/lab-reports')
  @Roles('admin', 'physician', 'nurse', 'lab_tech')
  getReports(@Param('pid') pid: string) {
    return this.labReports.getReports(+pid);
  }

  @Post('patients/:pid/lab-reports')
  @Roles('admin', 'lab_tech')
  createReport(@Param('pid') pid: string, @Body() dto: any, @Req() req: any) {
    return this.labReports.createReport(+pid, {
      ...dto,
      technicianId: dto.technicianId ?? req.user?.sub ?? null,
      technicianName: dto.technicianName ?? req.user?.displayName ?? null,
    });
  }

  @Get('lab/reports/:id')
  @Roles('admin', 'physician', 'nurse', 'lab_tech')
  getReport(@Param('id') id: string) {
    return this.labReports.getReport(+id);
  }

  @Put('lab/reports/:id')
  @Roles('admin', 'lab_tech')
  updateReport(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.labReports.updateReport(+id, dto, req.user?.sub ?? null);
  }

  @Post('lab/reports/:id/verify')
  @Roles('admin', 'lab_tech')
  verifyReport(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.labReports.verifyReport(+id, dto, req.user?.sub ?? null);
  }
}
