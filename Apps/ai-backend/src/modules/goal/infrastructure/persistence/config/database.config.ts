export function getDatabaseUri(): string {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required. Application cannot start without a database connection.');
  }
  return uri;
}

export function getDatabaseName(): string {
  return process.env['DATABASE_NAME'] ?? 'ai-backend';
}
