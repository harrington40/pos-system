import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NursingService } from './nursing.service';
import type { PatientNoteDto } from './nursing.service';
import { RnWorkbenchService } from './rn-workbench.service';
import type { FlagsDto, IoDto, TaskDto } from './rn-workbench.service';

/** Authenticated request used by the nursing endpoints. */
interface NursingRequest {
    user?: {
        sub?: number;
        username?: string;
        displayName?: string;
    };
}

/** Body accepted when moving a patient to a room. */
interface RoomUpdateDto {
    room?: string | null;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NursingController {
    constructor(
        private readonly nursing: NursingService,
        private readonly workbench: RnWorkbenchService,
    ) {}

    // ── Patient notes (chart + screening integration) ──────────────────────

    @Get('patients/:pid/notes')
    @Roles('admin', 'physician', 'nurse')
    getNotes(@Param('pid') pid: string) {
        return this.nursing.getPatientNotes(+pid);
    }

    @Post('patients/:pid/notes')
    @Roles('admin', 'physician', 'nurse')
    createNote(
        @Param('pid') pid: string,
        @Body() dto: PatientNoteDto,
        @Req() req: NursingRequest,
    ) {
        return this.nursing.createPatientNote(+pid, dto, {
            id: req.user?.sub,
            username: req.user?.username || 'provider',
            displayName: req.user?.displayName,
        });
    }

    // ── Room assignment ────────────────────────────────────────────────────

    @Get('patients/:pid/room')
    @Roles('admin', 'physician', 'nurse')
    getRoom(@Param('pid') pid: string) {
        return this.nursing.getRoom(+pid);
    }

    @Patch('patients/:pid/room')
    @Roles('admin', 'physician', 'nurse')
    updateRoom(@Param('pid') pid: string, @Body() dto: RoomUpdateDto) {
        return this.nursing.updateRoom(+pid, dto?.room);
    }

    // ── Registered nurse dashboard ─────────────────────────────────────────

    @Get('nurse/dashboard')
    @Roles('admin', 'nurse')
    getDashboard(@Req() req: NursingRequest) {
        return this.nursing.getNurseDashboard(Number(req.user?.sub));
    }

    @Patch('nurse/notes/:id/read')
    @Roles('admin', 'nurse')
    markRead(@Param('id') id: string, @Req() req: NursingRequest) {
        return this.nursing.markNoteRead(Number(req.user?.sub), +id);
    }

    @Post('nurse/notes/read-all')
    @Roles('admin', 'nurse')
    markAllRead(@Req() req: NursingRequest) {
        return this.nursing.markAllNotesRead(Number(req.user?.sub));
    }

    // ── RN workbench: flags, safety, I/O, tasks, escalation, handover ──────

    @Get('patients/:pid/flags')
    @Roles('admin', 'physician', 'nurse', 'registered_nurse')
    getFlags(@Param('pid') pid: string) {
        return this.workbench.getFlags(+pid);
    }

    @Patch('patients/:pid/flags')
    @Roles('admin', 'nurse', 'registered_nurse')
    setFlags(
        @Param('pid') pid: string,
        @Body() dto: FlagsDto,
        @Req() req: NursingRequest,
    ) {
        return this.workbench.setFlags(+pid, dto || {}, req.user?.sub);
    }

    @Get('patients/:pid/safety')
    @Roles('admin', 'physician', 'nurse', 'registered_nurse')
    getSafety(@Param('pid') pid: string) {
        return this.workbench.getSafety(+pid);
    }

    @Post('patients/:pid/safety/:kind')
    @Roles('admin', 'nurse', 'registered_nurse')
    saveSafety(
        @Param('pid') pid: string,
        @Param('kind') kind: string,
        @Body() dto: Record<string, unknown>,
        @Req() req: NursingRequest,
    ) {
        return this.workbench.saveSafety(+pid, kind, dto as never, req.user?.sub);
    }

    @Get('patients/:pid/io')
    @Roles('admin', 'physician', 'nurse', 'registered_nurse')
    getIO(@Param('pid') pid: string) {
        return this.workbench.getIO(+pid);
    }

    @Post('patients/:pid/io')
    @Roles('admin', 'nurse', 'registered_nurse')
    addIO(
        @Param('pid') pid: string,
        @Body() dto: IoDto,
        @Req() req: NursingRequest,
    ) {
        return this.workbench.addIO(+pid, dto || {}, req.user?.sub);
    }

    @Get('patients/:pid/handover')
    @Roles('admin', 'physician', 'nurse', 'registered_nurse')
    getHandover(@Param('pid') pid: string) {
        return this.workbench.getHandover(+pid);
    }

    @Post('patients/:pid/escalate')
    @Roles('admin', 'nurse', 'registered_nurse')
    escalate(
        @Param('pid') pid: string,
        @Body() dto: { reason?: string },
        @Req() req: NursingRequest,
    ) {
        return this.workbench.escalate(+pid, String(dto?.reason || ''), req.user?.sub);
    }

    @Get('nurse/tasks')
    @Roles('admin', 'physician', 'nurse', 'registered_nurse')
    listTasks(@Req() req: NursingRequest) {
        return this.workbench.listTasks(Number(req.user?.sub));
    }

    @Post('nurse/tasks')
    @Roles('admin', 'nurse', 'registered_nurse')
    createTask(@Body() dto: TaskDto, @Req() req: NursingRequest) {
        return this.workbench.createTask(dto || {}, req.user?.sub);
    }

    @Post('nurse/tasks/:id/complete')
    @Roles('admin', 'nurse', 'registered_nurse')
    completeTask(@Param('id') id: string) {
        return this.workbench.completeTask(+id);
    }

    @Get('nurse/workload')
    @Roles('admin', 'physician', 'nurse', 'registered_nurse')
    getWorkload() {
        return this.workbench.workload();
    }
}
