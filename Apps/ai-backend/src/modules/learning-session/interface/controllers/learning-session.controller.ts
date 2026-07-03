import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateLearningSessionCommand } from '../../application/commands/create-learning-session.command';
import { StartLearningSessionCommand } from '../../application/commands/start-learning-session.command';
import { PauseLearningSessionCommand } from '../../application/commands/pause-learning-session.command';
import { ResumeLearningSessionCommand } from '../../application/commands/resume-learning-session.command';
import { CompleteLearningSessionCommand } from '../../application/commands/complete-learning-session.command';
import { CancelLearningSessionCommand } from '../../application/commands/cancel-learning-session.command';
import { RecordEvidenceCommand } from '../../application/commands/record-evidence.command';
import { ToggleSessionTaskCommand } from '../../application/commands/toggle-session-task.command';
import { SaveSessionNotesCommand } from '../../application/commands/save-session-notes.command';
import { SubmitSessionReflectionCommand } from '../../application/commands/submit-session-reflection.command';
import { GetLearningSessionQuery } from '../../application/queries/get-learning-session.query';
import { GetLearningSessionsQuery } from '../../application/queries/get-learning-sessions.query';
import { GetLearningAnalyticsQuery } from '../../application/queries/get-learning-analytics.query';
import { GetEvidenceHistoryQuery } from '../../application/queries/get-evidence-history.query';
import { LearningSessionCommandService } from '../../application/services/learning-session-command.service';
import { LearningSessionQueryService } from '../../application/services/learning-session-query.service';
import { CreateLearningSessionDto, TaskInitDto } from '../dto/requests/create-learning-session.dto';
import { RecordEvidenceDto } from '../dto/requests/record-evidence.dto';
import { TransitionSessionDto } from '../dto/requests/transition-session.dto';
import { ToggleSessionTaskDto } from '../dto/requests/toggle-session-task.dto';
import { SaveSessionNotesDto } from '../dto/requests/save-session-notes.dto';
import { SubmitReflectionDto } from '../dto/requests/submit-reflection.dto';
import { LearningSessionResponseMapper } from '../mappers/learning-session-response.mapper';
import { LearningSessionGuard } from '../guards/learning-session.guard';
import { PermissionGuard } from '../../../../infrastructure/security/rbac/permission.guard';
import { RequirePermissions } from '../../../../infrastructure/security/rbac/require-permissions.decorator';
import { SessionTask } from '../../domain/entities/session-task.entity';
import { SkillId } from '../../../../shared/domain/identifiers';

@Controller('learning-sessions')
@UseGuards(LearningSessionGuard, PermissionGuard)
export class LearningSessionController {
  constructor(
    private readonly commandService: LearningSessionCommandService,
    private readonly queryService: LearningSessionQueryService,
    private readonly mapper: LearningSessionResponseMapper,
  ) {}

  @Post()
  @RequirePermissions('LearningSession.Write')
  async create(@Body() body: CreateLearningSessionDto, @Req() req: any) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:create-learning-session';

    const session = await this.commandService.createLearningSession(
      new CreateLearningSessionCommand(
        body.sessionId,
        body.goalId,
        body.roadmapId,
        body.learnerId,
        body.assessmentId ?? null,
        body.tasks ? body.tasks.map((t) => ({ id: t.id, title: t.title, skillId: t.skillId })) : [],
        traceId,
        correlationId,
        causationId,
      ),
    );

    return this.mapper.toResponse(session);
  }

  @Post(':id/start')
  @RequirePermissions('LearningSession.Start')
  async start(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TransitionSessionDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:start-learning-session';

    const session = await this.commandService.startLearningSession(
      new StartLearningSessionCommand(
        id,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Post(':id/pause')
  @RequirePermissions('LearningSession.Start') // Guard pause with Start/Write permissions as needed
  async pause(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TransitionSessionDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:pause-learning-session';

    const session = await this.commandService.pauseLearningSession(
      new PauseLearningSessionCommand(
        id,
        body.reason ?? null,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Post(':id/resume')
  @RequirePermissions('LearningSession.Start')
  async resume(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TransitionSessionDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:resume-learning-session';

    const session = await this.commandService.resumeLearningSession(
      new ResumeLearningSessionCommand(
        id,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Post(':id/complete')
  @RequirePermissions('LearningSession.Complete')
  async complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TransitionSessionDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:complete-learning-session';

    const session = await this.commandService.completeLearningSession(
      new CompleteLearningSessionCommand(
        id,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Post(':id/cancel')
  @RequirePermissions('LearningSession.Cancel')
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: TransitionSessionDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:cancel-learning-session';

    const session = await this.commandService.cancelLearningSession(
      new CancelLearningSessionCommand(
        id,
        body.reason ?? null,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Post(':id/evidence')
  @RequirePermissions('LearningSession.Write')
  async recordEvidence(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RecordEvidenceDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:record-evidence';

    const session = await this.commandService.recordEvidence(
      new RecordEvidenceCommand(
        id,
        body.evidenceId,
        body.activityId,
        body.completedTasks,
        body.timeSpent,
        body.interruptions,
        body.revisionCount,
        body.focusScore,
        body.engagementScore,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions('LearningSession.Write')
  async toggleTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('taskId') taskId: string,
    @Body() body: ToggleSessionTaskDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:toggle-session-task';

    const session = await this.commandService.toggleSessionTask(
      new ToggleSessionTaskCommand(
        id,
        taskId,
        body.completed,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Patch(':id/notes')
  @RequirePermissions('LearningSession.Write')
  async saveNotes(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SaveSessionNotesDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:save-session-notes';

    const session = await this.commandService.saveSessionNotes(
      new SaveSessionNotesCommand(id, body.content, traceId, correlationId, causationId),
    );
    return this.mapper.toResponse(session);
  }

  @Post(':id/reflection')
  @RequirePermissions('LearningSession.Write')
  async submitReflection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SubmitReflectionDto,
    @Req() req: any,
  ) {
    const traceId = req.traceId ?? req.headers?.['x-trace-id'] ?? 'unknown';
    const correlationId = body.correlationId ?? traceId;
    const causationId = body.causationId ?? 'http:submit-session-reflection';

    const session = await this.commandService.submitSessionReflection(
      new SubmitSessionReflectionCommand(
        id,
        body.content,
        body.rating,
        body.expectedVersion,
        traceId,
        correlationId,
        causationId,
      ),
    );
    return this.mapper.toResponse(session);
  }

  @Get()
  @RequirePermissions('LearningSession.Read')
  async findAll(@Query('learnerId') learnerId?: string) {
    const sessions = await this.queryService.getSessions(new GetLearningSessionsQuery(learnerId));
    return { items: this.mapper.toList(sessions), total: sessions.length };
  }

  @Get(':id')
  @RequirePermissions('LearningSession.Read')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const session = await this.queryService.getSession(new GetLearningSessionQuery(id));
    return this.mapper.toResponse(session!);
  }

  @Get(':id/analytics')
  @RequirePermissions('LearningSession.Analytics')
  async getAnalytics(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryService.getAnalytics(new GetLearningAnalyticsQuery(id));
  }

  @Get(':id/evidence')
  @RequirePermissions('LearningSession.Read')
  async getEvidenceHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    const history = await this.queryService.getEvidenceHistory(new GetEvidenceHistoryQuery(id));
    return { items: history, total: history.length };
  }
}
