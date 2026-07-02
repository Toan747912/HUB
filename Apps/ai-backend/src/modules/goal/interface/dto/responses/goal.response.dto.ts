export class GoalResponseDto {
  goalId!: string;
  learnerId!: string;
  title!: string;
  description!: string;
  type!: string;
  difficulty!: string;
  priority!: string;
  status!: string;
  targetDate!: string;
  version!: number;
  createdAt!: string;
  updatedAt!: string;
}

export class GoalListResponseDto {
  items!: GoalResponseDto[];
  total!: number;
}
