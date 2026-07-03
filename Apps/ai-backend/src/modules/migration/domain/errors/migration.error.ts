export class MigrationError extends Error {
  constructor(
    public readonly error: string,
    public readonly message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  toNormalized(): {
    success: false;
    error: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    return {
      success: false,
      error: this.error,
      message: this.message,
      details: this.details,
    };
  }
}
