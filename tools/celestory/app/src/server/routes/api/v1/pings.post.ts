import { defineEventHandler, readBody } from 'h3';
import { parseUpload, recordUpload } from '../../../utils/uploads';
import { success, toErrorResponse } from '../../../utils/respond';

/**
 * Append an anonymous upload event (visualise or publish). Deduped on the
 * (installId, dataFingerprint) pair, so re-uploading the same data is a no-op.
 * Stores only three headline integers — never a handle or ledger contents; the
 * profile id is assigned only by the password-gated publish claim.
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
