import { defineEventHandler, setHeader } from 'h3';
import { communityStats } from '../../../utils/uploads';
import { success, toErrorResponse } from '../../../utils/respond';
import { PUBLIC_AGGREGATE_CACHE_CONTROL } from '../../../utils/cache.constants';

/**
 * Community aggregates for the landing page: distinct owners and total community
 * integration/frames/targets, replayed on the fly from the anonymous
 * story_uploads log (latest snapshot per owner; no per-user data is read).
 * Successful responses are CDN-cached briefly so repeat views don't wake the DB.
 */
export default defineEventHandler(async (event) => {
  try {
    const stats = await communityStats();
    setHeader(event, 'cache-control', PUBLIC_AGGREGATE_CACHE_CONTROL);
    return success('COMMUNITY_STATS', 'Community statistics.', { ...stats });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
