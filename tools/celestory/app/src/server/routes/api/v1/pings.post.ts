import { defineEventHandler, readBody } from 'h3';
import { parseUpload, recordUpload } from '../../../utils/uploads';
import { success, toErrorResponse } from '../../../utils/respond';
import { consumeRateLimit } from '../../../utils/rate-limit';
import { PING_LIMIT } from '../../../utils/rate-limit.constants';
import { clientIpSubject } from '../../../utils/client-ip.util';

/**
 * Append an anonymous upload event (visualise or publish). Append-only, never
 * deduped — every visualise counts toward the community totals, repeats of the
 * same file included. Stores only three headline integers — never a handle or
 * story contents; the profile id is assigned only by the password-gated publish
 * claim. Rate-limited per client IP; a refused ping is invisible to the user.
 */
export default defineEventHandler(async (event) => {
  try {
    await consumeRateLimit(PING_LIMIT, clientIpSubject(event));
    const upload = parseUpload(await readBody<unknown>(event));
    await recordUpload(upload);
    return success('PING_RECORDED', 'Attempt recorded.', {});
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
