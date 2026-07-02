import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID()
  @IsNotEmpty()
  assessmentId!: string;

  @IsUUID()
  @IsNotEmpty()
  goalId!: string;

  @IsUUID()
  @IsNotEmpty()
  roadmapId!: string;

  @IsUUID()
  @IsNotEmpty()
  learnerId!: string;
}
