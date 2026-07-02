import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateMigrationDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}
