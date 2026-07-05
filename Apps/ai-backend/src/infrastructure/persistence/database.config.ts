export function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required. Application cannot start without a database connection.',
    );
  }
  return url;
}
