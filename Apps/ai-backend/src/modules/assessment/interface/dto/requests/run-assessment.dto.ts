import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

export class AssessmentTaskSignalDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  skillArea!: string;

  @IsBoolean()
  completed!: boolean;

  @IsNumber()
  @Min(0)
  estimatedDurationDays!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDurationDays?: number;
}

export class AssessmentHistorySignalDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore!: number;

  @IsString()
  @IsNotEmpty()
  readiness!: string;

  @IsDateString()
  computedAt!: string;
}

export class RunAssessmentDto {
  @IsUUID()
  @IsNotEmpty()
  assessmentId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  roadmapCompletionRatio!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentTaskSignalDto)
  tasks!: AssessmentTaskSignalDto[];

  @IsInt()
  @Min(0)
  revisionCount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentHistorySignalDto)
  previousRuns!: AssessmentHistorySignalDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
