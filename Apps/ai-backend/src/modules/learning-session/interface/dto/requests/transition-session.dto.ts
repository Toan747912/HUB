import { IsInt, IsOptional, IsString } from 'class-validator';

export class TransitionSessionDto {
  @IsInt()
  @IsOptional()
  expectedVersion?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
