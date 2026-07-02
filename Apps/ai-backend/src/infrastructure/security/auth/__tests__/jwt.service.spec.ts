import { AppJwtService, InvalidSignatureError, TokenExpiredError } from '../jwt.service';

describe('AppJwtService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: 'access-secret', REFRESH_SECRET: 'refresh-secret' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  // Evidence: JWT generation
  it('signAccessToken produces a well-formed 3-part JWT', () => {
    const service = new AppJwtService();
    const token = service.signAccessToken({ sub: 'user-1', roles: ['STUDENT'] });
    expect(token.split('.')).toHaveLength(3);
  });

  it('signRefreshToken produces a well-formed 3-part JWT', () => {
    const service = new AppJwtService();
    const token = service.signRefreshToken({ sub: 'user-1', jti: 'jti-1' }, 3600);
    expect(token.split('.')).toHaveLength(3);
  });

  // Evidence: JWT validation
  it('verifyAccessToken round-trips the original claims', async () => {
    const service = new AppJwtService();
    const token = service.signAccessToken({ sub: 'user-1', roles: ['ADMIN', 'TEACHER'] });
    const payload = await service.verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.roles).toEqual(['ADMIN', 'TEACHER']);
  });

  it('verifyRefreshToken round-trips the original claims', async () => {
    const service = new AppJwtService();
    const token = service.signRefreshToken({ sub: 'user-1', jti: 'jti-42' }, 3600);
    const payload = await service.verifyRefreshToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.jti).toBe('jti-42');
  });

  // Evidence: Expired token
  it('verifyAccessToken throws TokenExpiredError for an expired token', async () => {
    process.env['ACCESS_TOKEN_TTL'] = '-1s';
    const service = new AppJwtService();
    const token = service.signAccessToken({ sub: 'user-1', roles: ['STUDENT'] });

    await expect(service.verifyAccessToken(token)).rejects.toThrow(TokenExpiredError);
  });

  it('verifyRefreshToken throws TokenExpiredError for an expired token', async () => {
    const service = new AppJwtService();
    const token = service.signRefreshToken({ sub: 'user-1', jti: 'jti-1' }, -1);

    await expect(service.verifyRefreshToken(token)).rejects.toThrow(TokenExpiredError);
  });

  // Evidence: Invalid signature
  it('verifyAccessToken throws InvalidSignatureError when signed with a different secret', async () => {
    const signer = new AppJwtService();
    const token = signer.signAccessToken({ sub: 'user-1', roles: ['STUDENT'] });

    process.env['JWT_SECRET'] = 'a-completely-different-secret';
    const verifier = new AppJwtService();

    await expect(verifier.verifyAccessToken(token)).rejects.toThrow(InvalidSignatureError);
  });

  it('verifyAccessToken throws InvalidSignatureError for a malformed token', async () => {
    const service = new AppJwtService();
    await expect(service.verifyAccessToken('not.a.jwt')).rejects.toThrow(InvalidSignatureError);
  });

  it('fails fast when JWT_SECRET is unset', () => {
    delete process.env['JWT_SECRET'];
    const service = new AppJwtService();
    expect(() => service.signAccessToken({ sub: 'x', roles: [] })).toThrow(/JWT_SECRET/);
  });

  it('fails fast when REFRESH_SECRET is unset', () => {
    delete process.env['REFRESH_SECRET'];
    const service = new AppJwtService();
    expect(() => service.signRefreshToken({ sub: 'x', jti: 'y' }, 60)).toThrow(/REFRESH_SECRET/);
  });
});
