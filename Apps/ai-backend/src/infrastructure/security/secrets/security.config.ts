export function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. Application cannot start without it.',
    );
  }
  return secret;
}

export function getRefreshSecret(): string {
  const secret = process.env['REFRESH_SECRET'];
  if (!secret) {
    throw new Error(
      'REFRESH_SECRET environment variable is required. Application cannot start without it.',
    );
  }
  return secret;
}

export function getAccessTokenTtl(): string {
  return process.env['ACCESS_TOKEN_TTL'] ?? '15m';
}

export function getRefreshTokenTtlSeconds(): number {
  const raw = process.env['REFRESH_TOKEN_TTL_SECONDS'];
  return raw ? parseInt(raw, 10) : 7 * 24 * 60 * 60;
}

export function getCorsOrigin(): string | string[] {
  const raw = process.env['CORS_ORIGIN'];
  if (!raw) return [];
  return raw.split(',').map((origin) => origin.trim());
}

export function getRequestBodyLimit(): string {
  return process.env['REQUEST_BODY_LIMIT'] ?? '1mb';
}

export function getApiKeyHeaderName(): string {
  return process.env['API_KEY_HEADER'] ?? 'x-api-key';
}

/**
 * Off by default: self-service registration always yields STUDENT regardless of the
 * caller-supplied `roles` field. Enable only for seed/dev environments that need to
 * provision elevated accounts through the registration endpoint.
 */
export function isSelfAssignedRolesAllowed(): boolean {
  return process.env['ALLOW_SELF_ASSIGNED_ROLES'] === 'true';
}
