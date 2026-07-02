import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const MIN_LENGTH = 10;

export class WeakPasswordError extends Error {
  constructor(public readonly violations: string[]) {
    super(`Password does not meet policy requirements: ${violations.join(', ')}`);
    this.name = 'WeakPasswordError';
  }
}

@Injectable()
export class PasswordService {
  validatePolicy(plain: string): void {
    const violations: string[] = [];
    if (plain.length < MIN_LENGTH) violations.push(`minimum length ${MIN_LENGTH}`);
    if (!/[a-z]/.test(plain)) violations.push('at least one lowercase letter');
    if (!/[A-Z]/.test(plain)) violations.push('at least one uppercase letter');
    if (!/[0-9]/.test(plain)) violations.push('at least one digit');
    if (!/[^a-zA-Z0-9]/.test(plain)) violations.push('at least one symbol');

    if (violations.length > 0) {
      throw new WeakPasswordError(violations);
    }
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
