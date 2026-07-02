import { IsNotEmpty, IsString } from 'class-validator';

export class RollbackMigrationDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}
