import { getRequestHeader, type H3Event } from 'h3';
import { PayloadTooLargeError } from './celestory.error';
import { MAX_STORY_BYTES } from './story.constants';

/** True when a request's declared `content-length` is over the story limit. */
export function exceedsStoryLimit(contentLength: string | undefined): boolean {
  const bytes = contentLength ? Number(contentLength) : Number.NaN;
  return Number.isFinite(bytes) && bytes > MAX_STORY_BYTES;
}

/**
 * Refuse an oversized publish/update from its declared size alone — before the
 * body is read, a rate-limit counter is touched, or the database is queried.
 */
export function assertDeclaredStorySize(event: H3Event): void {
  if (exceedsStoryLimit(getRequestHeader(event, 'content-length'))) {
    throw new PayloadTooLargeError(MAX_STORY_BYTES);
  }
}

/** Refuse a parsed story whose JSON is over the limit (covers requests with no declared size). */
export function assertStorySize(story: unknown): void {
  const bytes = Buffer.byteLength(JSON.stringify(story ?? null), 'utf8');
  if (bytes > MAX_STORY_BYTES) {
    throw new PayloadTooLargeError(MAX_STORY_BYTES);
  }
}
