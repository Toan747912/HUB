import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateRoadmapCommand } from '../../application/commands/create-roadmap.command';
import { UpdateRoadmapCommand } from '../../application/commands/update-roadmap.command';
import { ArchiveRoadmapCommand } from '../../application/commands/archive-roadmap.command';
import { PublishRoadmapCommand } from '../../application/commands/publish-roadmap.command';
import { RegenerateRoadmapCommand } from '../../application/commands/regenerate-roadmap.command';
import { CompleteRoadmapTaskCommand } from '../../application/commands/complete-roadmap-task.command';
import { GetRoadmapQuery } from '../../application/queries/get-roadmap.query';
import { GetRoadmapsQuery } from '../../application/queries/get-roadmaps.query';
import { GetRoadmapProgressQuery } from '../../application/queries/get-roadmap-progress.query';
import { GetRoadmapHistoryQuery } from '../../application/queries/get-roadmap-history.query';
import { RoadmapCommandService } from '../../application/services/roadmap-command.service';
import { RoadmapQueryService } from '../../application/services/roadmap-query.service';
import { CreateRoadmapDto } from '../dto/requests/create-roadmap.dto';
import { UpdateRoadmapDto } from '../dto/requests/update-roadmap.dto';
import { VersionGuardedDto } from '../dto/requests/version-guarded.dto';
import { RoadmapResponseMapper } from '../mappers/roadmap-response.mapper';
import { RoadmapGuard } from '../guards/roadmap.guard';
import { TraceInterceptor } from '../interceptors/trace.interceptor';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { RoadmapRequestWithTrace } from '../middleware/trace.middleware';
import { PermissionGuard } from '../../../../infrastructure/security/rbac/permission.guard';
import { RequirePermissions } from '../../../../infrastructure/security/rbac/require-permissions.decorator';

@Controller('roadmap')
@UseGuards(RoadmapGuard, PermissionGuard)
@UseInterceptors(TraceInterceptor, ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class RoadmapController {
  constructor(
    private readonly commandService: RoadmapCommandService,
    private readonly queryService: RoadmapQueryService,
    private readonly mapper: RoadmapResponseMapper,
  ) {}

  @Post()
  @RequirePermissions('Roadmap.Write')
  async create(@Body() body: CreateRoadmapDto, @Req() req: RoadmapRequestWithTrace) {
    const command = new CreateRoadmapCommand(
      body.roadmapId,
      body.goalId,
      body.learnerId,
      body.title,
      body.description,
      body.goalType,
      body.difficulty,
      body.priority,
      body.constraints,
      body.targetDate,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:create-roadmap',
    );

    const roadmap = await this.commandService.createRoadmap(command);
    return this.mapper.toResponse(roadmap);
  }

  @Get()
  @RequirePermissions('Roadmap.Read')
  async findAll(@Query('learnerId') learnerId?: string) {
    const query = new GetRoadmapsQuery(learnerId);
    const roadmaps = await this.queryService.getRoadmaps(query);
    return this.mapper.toList(roadmaps);
  }

  @Get(':id')
  @RequirePermissions('Roadmap.Read')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetRoadmapQuery(id);
    const roadmap = await this.queryService.getRoadmap(query);
    return this.mapper.toResponse(roadmap);
  }

  @Get(':id/progress')
  @RequirePermissions('Roadmap.Read')
  async progress(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetRoadmapProgressQuery(id);
    const roadmap = await this.queryService.getRoadmapProgress(query);
    return this.mapper.toProgress(roadmap);
  }

  @Get(':id/history')
  @RequirePermissions('Roadmap.Read')
  async history(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetRoadmapHistoryQuery(id);
    const roadmap = await this.queryService.getRoadmapHistory(query);
    return this.mapper.toHistory(roadmap);
  }

  @Put(':id')
  @RequirePermissions('Roadmap.Write')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateRoadmapDto,
    @Req() req: RoadmapRequestWithTrace,
  ) {
    const command = new UpdateRoadmapCommand(
      id,
      body.changes,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:update-roadmap',
    );

    const roadmap = await this.commandService.updateRoadmap(command);
    return this.mapper.toResponse(roadmap);
  }

  @Delete(':id')
  @RequirePermissions('Roadmap.Archive')
  async archive(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: RoadmapRequestWithTrace) {
    const command = new ArchiveRoadmapCommand(
      id,
      undefined,
      req.traceId ?? 'unknown',
      req.traceId ?? 'unknown',
      'http:archive-roadmap',
    );
    const roadmap = await this.commandService.archiveRoadmap(command);
    return this.mapper.toResponse(roadmap);
  }

  @Post(':id/publish')
  @RequirePermissions('Roadmap.Publish')
  async publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VersionGuardedDto,
    @Req() req: RoadmapRequestWithTrace,
  ) {
    const command = new PublishRoadmapCommand(
      id,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:publish-roadmap',
    );
    const roadmap = await this.commandService.publishRoadmap(command);
    return this.mapper.toResponse(roadmap);
  }

  @Post(':id/tasks/:taskId/complete')
  @RequirePermissions('Roadmap.Write')
  async completeTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('taskId') taskId: string,
    @Body() body: VersionGuardedDto,
    @Req() req: RoadmapRequestWithTrace,
  ) {
    const command = new CompleteRoadmapTaskCommand(
      id,
      taskId,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:complete-roadmap-task',
    );
    const roadmap = await this.commandService.completeTask(command);
    return this.mapper.toResponse(roadmap);
  }

  @Post(':id/regenerate')
  @RequirePermissions('Roadmap.Regenerate')
  async regenerate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VersionGuardedDto,
    @Req() req: RoadmapRequestWithTrace,
  ) {
    const command = new RegenerateRoadmapCommand(
      id,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:regenerate-roadmap',
    );
    const roadmap = await this.commandService.regenerateRoadmap(command);
    return this.mapper.toResponse(roadmap);
  }
}
