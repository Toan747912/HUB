import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { CreateGoalCommand } from '../../application/commands/create-goal.command';
import { UpdateGoalCommand } from '../../application/commands/update-goal.command';
import { ArchiveGoalCommand } from '../../application/commands/archive-goal.command';
import { CompleteGoalCommand } from '../../application/commands/complete-goal.command';
import { GetGoalQuery } from '../../application/queries/get-goal.query';
import { GetGoalsQuery } from '../../application/queries/get-goals.query';
import { GoalCommandService } from '../../application/services/goal-command.service';
import { GoalQueryService } from '../../application/services/goal-query.service';
import { CreateGoalDto } from '../dto/requests/create-goal.dto';
import { UpdateGoalDto } from '../dto/requests/update-goal.dto';
import { CompleteGoalDto } from '../dto/requests/complete-goal.dto';
import { GoalResponseMapper } from '../mappers/goal-response.mapper';
import { GoalGuard } from '../guards/goal.guard';
import { TraceInterceptor } from '../interceptors/trace.interceptor';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { GoalRequestWithTrace } from '../middleware/trace.middleware';
import { PermissionGuard } from '../../../../infrastructure/security/rbac/permission.guard';
import { RequirePermissions } from '../../../../infrastructure/security/rbac/require-permissions.decorator';

@Controller('goal')
@UseGuards(GoalGuard, PermissionGuard)
@UseInterceptors(TraceInterceptor, ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class GoalController {
  constructor(
    private readonly commandService: GoalCommandService,
    private readonly queryService: GoalQueryService,
    private readonly mapper: GoalResponseMapper
  ) {}

  @Post()
  @RequirePermissions('Goal.Write')
  async create(@Body() body: CreateGoalDto, @Req() req: GoalRequestWithTrace) {
    const command = new CreateGoalCommand(
      body.goalId,
      body.learnerId,
      body.title,
      body.description,
      body.type as any,
      body.difficulty as any,
      body.priority as any,
      body.targetDate,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:create-goal'
    );

    const goal = await this.commandService.createGoal(command);
    return this.mapper.toResponse(goal as any);
  }

  @Get()
  @RequirePermissions('Goal.Read')
  async findAll() {
    const marker = {
      marker: 'GOAL_CALL_CHAIN',
      stage: 'controller.findAll.enter',
      queryServiceType: this.queryService?.constructor?.name,
      mapperType: this.mapper?.constructor?.name,
      queryServiceDefined: this.queryService !== undefined && this.queryService !== null,
      mapperDefined: this.mapper !== undefined && this.mapper !== null
    };
    console.log(JSON.stringify(marker));

    const query = new GetGoalsQuery();
    console.log(JSON.stringify({ marker: 'GOAL_CALL_CHAIN', stage: 'controller.findAll.beforeQueryService' }));

    const goals = await this.queryService.getGoals(query);

    console.log(
      JSON.stringify({
        marker: 'GOAL_CALL_CHAIN',
        stage: 'controller.findAll.afterQueryService',
        goalsType: typeof goals,
        isArray: Array.isArray(goals),
        goalsLength: Array.isArray(goals) ? goals.length : undefined
      })
    );

    const items = this.mapper.toList(goals as any[]);

    console.log(
      JSON.stringify({
        marker: 'GOAL_CALL_CHAIN',
        stage: 'controller.findAll.afterMapper',
        itemsType: typeof items,
        isArray: Array.isArray(items),
        itemsLength: Array.isArray(items) ? items.length : undefined
      })
    );

    return { items, total: items.length };
  }

  @Get(':id')
  @RequirePermissions('Goal.Read')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const query = new GetGoalQuery(id);
    const goal = await this.queryService.getGoal(query);
    return this.mapper.toResponse(goal as any);
  }

  @Put(':id')
  @RequirePermissions('Goal.Write')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateGoalDto,
    @Req() req: GoalRequestWithTrace
  ) {
    const command = new UpdateGoalCommand(
      id,
      body.title,
      body.description,
      body.type as any,
      body.difficulty as any,
      body.priority as any,
      body.targetDate,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:update-goal'
    );

    const goal = await this.commandService.updateGoal(command);
    return this.mapper.toResponse(goal as any);
  }

  @Delete(':id')
  @RequirePermissions('Goal.Archive')
  async archive(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: GoalRequestWithTrace) {
    const command = new ArchiveGoalCommand(id, 0, req.traceId ?? 'unknown', req.traceId ?? 'unknown', 'http:archive-goal');
    const goal = await this.commandService.archiveGoal(command);
    return this.mapper.toResponse(goal as any);
  }

  @Post(':id/complete')
  @RequirePermissions('Goal.Complete')
  async complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CompleteGoalDto,
    @Req() req: GoalRequestWithTrace
  ) {
    const command = new CompleteGoalCommand(
      id,
      body.expectedVersion,
      req.traceId ?? 'unknown',
      body.correlationId ?? req.traceId ?? 'unknown',
      body.causationId ?? 'http:complete-goal'
    );
    const goal = await this.commandService.completeGoal(command);
    return this.mapper.toResponse(goal as any);
  }
}
