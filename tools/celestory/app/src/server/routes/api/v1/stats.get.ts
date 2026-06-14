import { defineEventHandler } from 'h3';
import { communityStats } from '../../../utils/uploads';
import { success, toErrorResponse } from '../../../utils/respond';

/**
 * Community aggregates for the landing page: distinct owners and total community
 * integration/frames/objects, replayed on the fly from the anonymous
 * ledger_uploads log (latest snapshot per owner; no per-user data is read).
 */
export default defineEventHandler(async (event) => {
  try {
    const stats = await communityStats();
    return success('COMMUNITY_STATS', 'Community statistics.', { ...stats });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
