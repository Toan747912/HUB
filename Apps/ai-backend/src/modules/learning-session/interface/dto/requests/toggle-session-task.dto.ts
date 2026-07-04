import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class ToggleSessionTaskDto {
  @IsBoolean()
  completed!: boolean;

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
