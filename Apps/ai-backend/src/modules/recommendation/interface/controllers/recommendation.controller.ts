import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { GenerateRecommendationsCommand } from '../../application/commands/generate-recommendations.command';
import { ApproveRecommendationCommand } from '../../application/commands/approve-recommendation.command';
import { RejectRecommendationCommand } from '../../application/commands/reject-recommendation.command';
import { ArchiveRecommendationCommand } from '../../application/commands/archive-recommendation.command';
import { GetRecommendationQuery } from '../../application/queries/get-recommendation.query';
import { GetRecommendationsQuery } from '../../application/queries/get-recommendations.query';
import { GetRecommendationHistoryQuery } from '../../application/queries/get-recommendation-history.query';
import { GetLearningStrategiesQuery } from '../../application/queries/get-learning-strategies.query';
import { RecommendationCommandService } from '../../application/services/recommendation-command.service';
import { RecommendationQueryService } from '../../application/services/recommendation-query.service';
import { GenerateRecommendationsDto } from '../dto/requests/generate-recommendations.dto';
import { RejectRecommendationDto } from '../dto/requests/reject-recommendation.dto';
import { VersionGuardedDto } from '../dto/requests/version-guarded.dto';
import { RecommendationResponseMapper } from '../mappers/recommendation-response.mapper';
import { RecommendationGuard } from '../guards/recommendation.guard';
import { TraceInterceptor } from '../interceptors/trace.interceptor';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { RecommendationRequestWithTrace } from '../middleware/trace.middleware';
import { PermissionGuard } from '../../../../infrastructure/security/rbac/permission.guard';
import { RequirePermissions } from '../../../../infrastructure/security/rbac/require-permissions.decorator';

@Controller('recommendation')
@UseGuards(RecommendationGuard, PermissionGuard)
@UseInterceptors(TraceInterceptor, ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class RecommendationController {
  constructor(
    private readonly commandService: RecommendationCommandService,
    private readonly queryService: RecommendationQueryService,
    private readonly mapper: RecommendationResponseMapper
  ) {}

  @Post('generate')
  @RequirePermissions('Recommendation.Generate')
  async generate(@Body() body: GenerateRecommendationsDto, @Req() req: RecommendationRequestWithTrace) {
    const command = new GenerateRecommendationsCommand(
      body.recommendationId,
      body.goalId,
      body.roadmapId,
      body.assessmentId,
      body.learnerId,
      body.goalPriority,
      body.goalDifficulty,
      body.targetDate,
      body.referenceDate,
      body.roadmapCompletionRatio,
      body.revisionCount,
      body.tasks,
      body.competencies,
      body.knowledgeGaps,
      body.confidenceScore,
      body.readiness,
      req.traceId ?? 'unknown',
      req.traceId ?? 'unknown',
      'http:generate-recommendations'
    );

    const recommendation = await this.commandService.generateRecommendations(command);
    return this.mapper.toResponse(recommendation);
  }

  @Get('strategies')
  @RequirePermissions('Recommendation.Read')
  strategies() {
    const query = new GetLearningStrategiesQuery();
    const entries = this.queryService.getLearningStrategies(query);
    return this.mapper.toStrategyCatalog(entries);
  }

  @Get()
  @RequirePermissions('Recommendation.Read')
  async findAll(@Query('learnerId') learnerId?: string) {
    const query = new GetRecommendationsQuery(learnerId);
    const recommendations = await this.queryService.getRecommendations(query);
    return this.mapper.toList(recommendations);
  }

  @Get(':id')
  @RequirePermissions('Recommendation.Read')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetRecommendationQuery(id);
    const recommendation = await this.queryService.getRecommendation(query);
    return this.mapper.toResponse(recommendation);
  }

  @Get(':id/history')
  @RequirePermissions('Recommendation.Read')
  async history(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetRecommendationHistoryQuery(id);
    const recommendation = await this.queryService.getRecommendationHistory(query);
    return this.mapper.toHistory(recommendation);
  }

  @Post(':id/approve')
  @RequirePermissions('Recommendation.Approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VersionGuardedDto,
    @Req() req: RecommendationRequestWithTrace
  ) {
    const command = new ApproveRecommendationCommand(
      id,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:approve-recommendation'
    );
    const recommendation = await this.commandService.approveRecommendation(command);
    return this.mapper.toResponse(recommendation);
  }

  @Post(':id/reject')
  @RequirePermissions('Recommendation.Reject')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RejectRecommendationDto,
    @Req() req: RecommendationRequestWithTrace
  ) {
    const command = new RejectRecommendationCommand(
      id,
      body.reason,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:reject-recommendation'
    );
    const recommendation = await this.commandService.rejectRecommendation(command);
    return this.mapper.toResponse(recommendation);
  }

  @Delete(':id')
  @RequirePermissions('Recommendation.Archive')
  async archive(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: RecommendationRequestWithTrace) {
    const command = new ArchiveRecommendationCommand(
      id,
      undefined,
      req.traceId ?? 'unknown',
      req.traceId ?? 'unknown',
      'http:archive-recommendation'
    );
    const recommendation = await this.commandService.archiveRecommendation(command);
    return this.mapper.toResponse(recommendation);
  }
}
