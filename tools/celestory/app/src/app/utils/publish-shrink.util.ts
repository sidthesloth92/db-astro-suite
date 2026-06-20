import type { StorySummary } from '../models/story.model';

/**
 * Returns a warning when the staged story has less integration or fewer frames
 * than the already-published one — a likely sign of updating from a device that
 * doesn't hold your full library, which would replace your history. Returns ''
 * when the update is equal or larger (safe to publish silently).
 */
export function publishShrinkWarning(
  staged: StorySummary,
  published: StorySummary,
): string {
  const lessTime = staged.totalIntegrationSeconds < published.totalIntegrationSeconds;
  const lessFrames = staged.lightFrameCount < published.lightFrameCount;
  if (!lessTime && !lessFrames) {
    return '';
  }
  return (
    'This update has less integration than your live profile — you may be on a ' +
    'device that doesn’t have your full library. Publishing will replace it.'
  );
}
