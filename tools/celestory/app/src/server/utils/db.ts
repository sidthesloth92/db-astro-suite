import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { config } from './config';
import { DatabaseConfigError } from './celestory.error';

/** Cached client so each warm invocation reuses one connection setup. */
let client: NeonQueryFunction<false, false> | null = null;

/**
 * Return the Neon SQL client, lazily created from config.databaseUrl.
 * Throws DatabaseConfigError if DATABASE_URL is not set.
 *
 * Usage: const sql = getDb(); const rows = await sql`SELECT 1`;
 */
export function getDb(): NeonQueryFunction<false, false> {
  if (!config.databaseUrl) {
    throw new DatabaseConfigError();
  }
  if (!client) {
    client = neon(config.databaseUrl);
  }
  return client;
}
