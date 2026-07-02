export class RoadmapNotFoundError extends Error {
  constructor(roadmapId: string) {
    super(`Roadmap not found: ${roadmapId}`);
    this.name = 'RoadmapNotFoundError';
  }
}

export class RoadmapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoadmapValidationError';
  }
}

export class RoadmapVersionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
    this.name = 'RoadmapVersionConflictError';
  }
}

export class RoadmapStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoadmapStateTransitionError';
  }
}
