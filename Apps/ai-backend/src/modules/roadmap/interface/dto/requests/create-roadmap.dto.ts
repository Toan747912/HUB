import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRoadmapDto {
  @IsUUID()
  @IsNotEmpty()
  roadmapId!: string;

  @IsUUID()
  @IsNotEmpty()
  goalId!: string;

  @IsUUID()
  @IsNotEmpty()
  learnerId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  goalType!: string;

  @IsString()
  @IsNotEmpty()
  difficulty!: string;

  @IsString()
  @IsNotEmpty()
  priority!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  constraints!: string[];

  @IsDateString()
  @IsNotEmpty()
  targetDate!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
