import { IsArray, IsDefined, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DomainRoute } from '../../../domain/ai.types';

class AiInputDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}

export class AiExecuteDto {
  @IsIn(['goal', 'roadmap', 'learning_session', 'knowledge', 'evidence', 'assessment', 'recommendation', 'discovery', 'teaching'])
  route!: DomainRoute;

  @IsDefined()
  @ValidateNested()
  @Type(() => AiInputDto)
  input!: AiInputDto;

  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  memory?: unknown[];

  @IsArray()
  @IsOptional()
  attempted_writes?: string[];
}
