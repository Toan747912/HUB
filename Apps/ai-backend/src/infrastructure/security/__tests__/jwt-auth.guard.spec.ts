import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../api-keys/api-key.service';
import { AppJwtService } from '../auth/jwt.service';
import { AuthenticatedRequest, JwtAuthGuard } from '../jwt-auth.guard';
import { RequestContextService } from '../../observability/request-context.service';

describe('JwtAuthGuard', () => {
  const OLD_ENV = process.env;
  let jwt: AppJwtService;
  let apiKeys: jest.Mocked<Pick<ApiKeyService, 'verify'>>;
  let requestContext: RequestContextService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: 'access-secret', REFRESH_SECRET: 'refresh-secret' };
    jwt = new AppJwtService();
    apiKeys = { verify: jest.fn() };
    requestContext = new RequestContextService();
    guard = new JwtAuthGuard(jwt, apiKeys as unknown as ApiKeyService, requestContext);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  const makeContext = (headers: Record<string, string>): { context: ExecutionContext; request: Partial<AuthenticatedRequest> } => {
    const request: Partial<AuthenticatedRequest> = { headers: headers as any };
    const context = {
      switchToHttp: () => ({ getRequest: () => request })
    } as unknown as ExecutionContext;
    return { context, request };
  };

  it('accepts a valid access token and attaches request.user', async () => {
    const token = jwt.signAccessToken({ sub: 'user-1', roles: ['STUDENT'] });
    const { context, request } = makeContext({ authorization: `Bearer ${token}` });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ sub: 'user-1', roles: ['STUDENT'] });
  });

  it('rejects a missing Authorization header with 401', async () => {
    const { context } = makeContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a malformed Authorization header (no Bearer prefix)', async () => {
    const { context } = makeContext({ authorization: 'Token abc123' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired access token with 401', async () => {
    process.env['ACCESS_TOKEN_TTL'] = '-1s';
    const expiredJwt = new AppJwtService();
    const token = expiredJwt.signAccessToken({ sub: 'user-1', roles: ['STUDENT'] });
    const { context } = makeContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different secret', async () => {
    process.env['JWT_SECRET'] = 'a-different-secret';
    const otherJwt = new AppJwtService();
    const token = otherJwt.signAccessToken({ sub: 'user-1', roles: ['STUDENT'] });

    process.env['JWT_SECRET'] = 'access-secret'; // restore for the guard under test
    const { context } = makeContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  // Evidence: API key
  it('accepts a valid API key and attaches a SYSTEM identity', async () => {
    apiKeys.verify.mockResolvedValue(true);
    const { context, request } = makeContext({ 'x-api-key': 'valid-raw-key' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ sub: 'system', roles: ['SYSTEM'] });
  });

  it('rejects an invalid/unknown API key with 401', async () => {
    apiKeys.verify.mockResolvedValue(false);
    const { context } = makeContext({ 'x-api-key': 'bad-key' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('populates RequestContextService.userId for downstream logs/audit', async () => {
    const token = jwt.signAccessToken({ sub: 'user-99', roles: ['ADMIN'] });
    const { context } = makeContext({ authorization: `Bearer ${token}` });

    await requestContext.run({ traceId: 'trace-1' }, async () => {
      await guard.canActivate(context);
      expect(requestContext.get()?.userId).toBe('user-99');
    });
  });
});
