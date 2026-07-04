import { defineEventHandler, readBody } from 'h3';
import { parseUpload, recordUpload } from '../../../utils/uploads';
import { success, toErrorResponse } from '../../../utils/respond';

/**
 * Append an anonymous upload event (visualise or publish). Append-only, never
 * deduped — every visualise counts toward the community totals, repeats of the
 * same file included. Stores only three headline integers — never a handle or
 * story contents; the profile id is assigned only by the password-gated publish
 * claim.
 */
export default defineEventHandler(async (event) => {
  try {
    const upload = parseUpload(await readBody<unknown>(event));
    await recordUpload(upload);
    return success('PING_RECORDED', 'Attempt recorded.', {});
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
