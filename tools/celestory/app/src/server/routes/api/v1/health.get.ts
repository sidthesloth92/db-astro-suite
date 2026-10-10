import { defineEventHandler } from 'h3';
import { getDb } from '../../../utils/db';
import { success, toErrorResponse } from '../../../utils/respond';

/**
 * Liveness + DB connectivity probe. Runs a trivial query so a green response
 * means the serverless function can actually reach Postgres.
 */
export default defineEventHandler(async (event) => {
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return success('HEALTHY', 'Celestory is healthy.', {
      database: 'connected',
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
