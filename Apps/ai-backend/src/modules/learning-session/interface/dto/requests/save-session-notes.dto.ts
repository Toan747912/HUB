import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveSessionNotesDto {
  @IsString()
  @MaxLength(20000)
  content!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  causationId?: string;
}
