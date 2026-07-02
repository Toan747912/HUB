import { THROTTLER_LIMIT } from '@nestjs/throttler/dist/throttler.constants';
import { AuthController } from '../auth.controller';

describe('AuthController', () => {
  // Evidence: rate limiting (brute-force protection on login specifically)
  it('login route carries a @Throttle override tighter than the global default (30/min)', () => {
    // @Throttle stores each option key under `${THROTTLER_LIMIT}${throttlerName}` —
    // the default throttler set (matching app.module.ts's unnamed ThrottlerModule.forRoot entry).
    const limit = Reflect.getMetadata(`${THROTTLER_LIMIT}default`, AuthController.prototype.login);
    expect(limit).toBeDefined();
    expect(limit).toBeLessThan(30);
  });
});
