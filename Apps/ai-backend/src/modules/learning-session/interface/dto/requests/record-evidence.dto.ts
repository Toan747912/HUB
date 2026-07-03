import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';

export class RecordEvidenceDto {
  @IsUUID()
  @IsNotEmpty()
  evidenceId!: string;

  @IsUUID()
  @IsOptional()
  activityId?: string;

  @IsInt()
  @Min(0)
  completedTasks!: number;

  @IsInt()
  @Min(0)
  timeSpent!: number;

  @IsInt()
  @Min(0)
  interruptions!: number;

  @IsInt()
  @Min(0)
  revisionCount!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  focusScore!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  engagementScore!: number;

  @IsInt()
  @IsOptional()
  expectedVersion?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
