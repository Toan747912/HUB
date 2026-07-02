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

export class RecommendationTaskSignalDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsBoolean()
  completed!: boolean;

  @IsInt()
  @Min(0)
  order!: number;

  @IsArray()
  @IsString({ each: true })
  dependsOn!: string[];

  @IsNumber()
  @Min(0)
  estimatedDurationDays!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDurationDays?: number;
}

export class RecommendationCompetencySignalDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @IsString()
  @IsNotEmpty()
  level!: string;
}

export class RecommendationGapSignalDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @IsString()
  @IsNotEmpty()
  weight!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class GenerateRecommendationsDto {
  @IsUUID()
  @IsNotEmpty()
  recommendationId!: string;

  @IsUUID()
  @IsNotEmpty()
  goalId!: string;

  @IsUUID()
  @IsNotEmpty()
  roadmapId!: string;

  @IsUUID()
  @IsNotEmpty()
  assessmentId!: string;

  @IsUUID()
  @IsNotEmpty()
  learnerId!: string;

  @IsString()
  @IsNotEmpty()
  goalPriority!: string;

  @IsString()
  @IsNotEmpty()
  goalDifficulty!: string;

  @IsDateString()
  @IsNotEmpty()
  targetDate!: string;

  @IsDateString()
  @IsNotEmpty()
  referenceDate!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  roadmapCompletionRatio!: number;

  @IsInt()
  @Min(0)
  revisionCount!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecommendationTaskSignalDto)
  tasks!: RecommendationTaskSignalDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendationCompetencySignalDto)
  competencies!: RecommendationCompetencySignalDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendationGapSignalDto)
  knowledgeGaps!: RecommendationGapSignalDto[];

  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore!: number;

  @IsString()
  @IsNotEmpty()
  readiness!: string;
}
