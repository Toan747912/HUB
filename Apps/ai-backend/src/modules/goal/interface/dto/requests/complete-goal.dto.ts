import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CompleteGoalDto {
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
