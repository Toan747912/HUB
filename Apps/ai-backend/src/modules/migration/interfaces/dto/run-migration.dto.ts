import { IsNotEmpty, IsString } from 'class-validator';

export class RunMigrationDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}
