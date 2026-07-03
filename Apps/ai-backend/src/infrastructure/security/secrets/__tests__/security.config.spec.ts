import { readFileSync } from 'fs';
import { join } from 'path';
import {
  getAccessTokenTtl,
  getApiKeyHeaderName,
  getCorsOrigin,
  getJwtSecret,
  getRefreshSecret,
  getRefreshTokenTtlSeconds,
  getRequestBodyLimit,
} from '../security.config';

describe('security.config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('fails fast when JWT_SECRET is unset', () => {
    delete process.env['JWT_SECRET'];
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('fails fast when REFRESH_SECRET is unset', () => {
    delete process.env['REFRESH_SECRET'];
    expect(() => getRefreshSecret()).toThrow(/REFRESH_SECRET/);
  });

  it('returns the configured secrets when set', () => {
    process.env['JWT_SECRET'] = 'my-jwt-secret';
    process.env['REFRESH_SECRET'] = 'my-refresh-secret';
    expect(getJwtSecret()).toBe('my-jwt-secret');
    expect(getRefreshSecret()).toBe('my-refresh-secret');
  });

  it('defaults access token TTL to 15m', () => {
    delete process.env['ACCESS_TOKEN_TTL'];
    expect(getAccessTokenTtl()).toBe('15m');
  });

  it('defaults refresh token TTL to 7 days in seconds', () => {
    delete process.env['REFRESH_TOKEN_TTL_SECONDS'];
    expect(getRefreshTokenTtlSeconds()).toBe(7 * 24 * 60 * 60);
  });

  it('CORS origin defaults to an empty (closed) list when unset', () => {
    delete process.env['CORS_ORIGIN'];
    expect(getCorsOrigin()).toEqual([]);
  });

  it('parses a comma-separated CORS_ORIGIN', () => {
    process.env['CORS_ORIGIN'] = 'https://a.example.com, https://b.example.com';
    expect(getCorsOrigin()).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('defaults the API key header name to x-api-key', () => {
    delete process.env['API_KEY_HEADER'];
    expect(getApiKeyHeaderName()).toBe('x-api-key');
  });

  it('defaults the request body limit to 1mb', () => {
    delete process.env['REQUEST_BODY_LIMIT'];
    expect(getRequestBodyLimit()).toBe('1mb');
  });

  // Evidence: no hardcoded credentials
  it('security.config.ts contains no literal secret-looking string values', () => {
    const source = readFileSync(join(__dirname, '..', 'security.config.ts'), 'utf-8');
    // Every secret is read from process.env[...]; no quoted long alphanumeric literal
    // resembling a key/secret should appear outside of default-value strings we expect.
    const suspiciousLiteral = /['"](?:[A-Za-z0-9+/]{24,}|sk_[A-Za-z0-9]+|AKIA[A-Z0-9]{16})['"]/;
    expect(suspiciousLiteral.test(source)).toBe(false);
    expect(source).toContain("process.env['JWT_SECRET']");
    expect(source).toContain("process.env['REFRESH_SECRET']");
  });

  it('main.ts contains no literal secret-looking string values', () => {
    const source = readFileSync(join(__dirname, '..', '..', '..', '..', 'main.ts'), 'utf-8');
    const suspiciousLiteral = /['"](?:[A-Za-z0-9+/]{24,}|sk_[A-Za-z0-9]+|AKIA[A-Z0-9]{16})['"]/;
    expect(suspiciousLiteral.test(source)).toBe(false);
  });
});
