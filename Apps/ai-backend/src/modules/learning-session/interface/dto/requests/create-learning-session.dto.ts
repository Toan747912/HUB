import { IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskInitDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUUID()
  @IsNotEmpty()
  skillId!: string;
}

export class CreateLearningSessionDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId!: string;

  @IsUUID()
  @IsNotEmpty()
  goalId!: string;

  @IsUUID()
  @IsNotEmpty()
  roadmapId!: string;

  @IsUUID()
  @IsNotEmpty()
  learnerId!: string;

  @IsUUID()
  @IsOptional()
  assessmentId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaskInitDto)
  tasks?: TaskInitDto[];

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
