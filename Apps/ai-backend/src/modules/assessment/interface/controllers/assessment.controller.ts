import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateAssessmentCommand } from '../../application/commands/create-assessment.command';
import { RunAssessmentCommand } from '../../application/commands/run-assessment.command';
import { ApproveAssessmentCommand } from '../../application/commands/approve-assessment.command';
import { ArchiveAssessmentCommand } from '../../application/commands/archive-assessment.command';
import { GetAssessmentQuery } from '../../application/queries/get-assessment.query';
import { GetAssessmentsQuery } from '../../application/queries/get-assessments.query';
import { GetCompetencyProfileQuery } from '../../application/queries/get-competency-profile.query';
import { GetKnowledgeGapsQuery } from '../../application/queries/get-knowledge-gaps.query';
import { AssessmentCommandService } from '../../application/services/assessment-command.service';
import { AssessmentQueryService } from '../../application/services/assessment-query.service';
import { CreateAssessmentDto } from '../dto/requests/create-assessment.dto';
import { RunAssessmentDto } from '../dto/requests/run-assessment.dto';
import { VersionGuardedDto } from '../dto/requests/version-guarded.dto';
import { AssessmentResponseMapper } from '../mappers/assessment-response.mapper';
import { AssessmentGuard } from '../guards/assessment.guard';
import { TraceInterceptor } from '../interceptors/trace.interceptor';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { AssessmentRequestWithTrace } from '../middleware/trace.middleware';
import { PermissionGuard } from '../../../../infrastructure/security/rbac/permission.guard';
import { RequirePermissions } from '../../../../infrastructure/security/rbac/require-permissions.decorator';

@Controller('assessment')
@UseGuards(AssessmentGuard, PermissionGuard)
@UseInterceptors(TraceInterceptor, ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class AssessmentController {
  constructor(
    private readonly commandService: AssessmentCommandService,
    private readonly queryService: AssessmentQueryService,
    private readonly mapper: AssessmentResponseMapper,
  ) {}

  @Post()
  @RequirePermissions('Assessment.Write')
  async create(@Body() body: CreateAssessmentDto, @Req() req: AssessmentRequestWithTrace) {
    const command = new CreateAssessmentCommand(
      body.assessmentId,
      body.goalId,
      body.roadmapId,
      body.learnerId,
      req.traceId ?? 'unknown',
      req.traceId ?? 'unknown',
      'http:create-assessment',
    );

    const assessment = await this.commandService.createAssessment(command);
    return this.mapper.toResponse(assessment);
  }

  @Post('run')
  @RequirePermissions('Assessment.Run')
  async run(@Body() body: RunAssessmentDto, @Req() req: AssessmentRequestWithTrace) {
    const command = new RunAssessmentCommand(
      body.assessmentId,
      body.roadmapCompletionRatio,
      body.tasks,
      body.revisionCount,
      body.previousRuns,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:run-assessment',
    );

    const assessment = await this.commandService.runAssessment(command);
    return this.mapper.toResponse(assessment);
  }

  @Get()
  @RequirePermissions('Assessment.Read')
  async findAll(@Query('learnerId') learnerId?: string) {
    const query = new GetAssessmentsQuery(learnerId);
    const assessments = await this.queryService.getAssessments(query);
    return this.mapper.toList(assessments);
  }

  @Get(':id')
  @RequirePermissions('Assessment.Read')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetAssessmentQuery(id);
    const assessment = await this.queryService.getAssessment(query);
    return this.mapper.toResponse(assessment);
  }

  @Get(':id/profile')
  @RequirePermissions('Assessment.Read')
  async profile(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetCompetencyProfileQuery(id);
    const assessment = await this.queryService.getCompetencyProfile(query);
    return this.mapper.toCompetencyProfile(assessment);
  }

  @Get(':id/gaps')
  @RequirePermissions('Assessment.Read')
  async gaps(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetKnowledgeGapsQuery(id);
    const assessment = await this.queryService.getKnowledgeGaps(query);
    return this.mapper.toKnowledgeGaps(assessment);
  }

  @Post(':id/approve')
  @RequirePermissions('Assessment.Approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VersionGuardedDto,
    @Req() req: AssessmentRequestWithTrace,
  ) {
    const command = new ApproveAssessmentCommand(
      id,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:approve-assessment',
    );
    const assessment = await this.commandService.approveAssessment(command);
    return this.mapper.toResponse(assessment);
  }

  @Post(':id/archive')
  @RequirePermissions('Assessment.Archive')
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VersionGuardedDto,
    @Req() req: AssessmentRequestWithTrace,
  ) {
    const command = new ArchiveAssessmentCommand(
      id,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:archive-assessment',
    );
    const assessment = await this.commandService.archiveAssessment(command);
    return this.mapper.toResponse(assessment);
  }
}
