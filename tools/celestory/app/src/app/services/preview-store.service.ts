import { Injectable, signal } from '@angular/core';
import type { CelestoryStory } from '../models/story.model';

/**
 * In-memory hand-off for the ① Visualise path: the landing page sets the parsed
 * story here, the /preview page reads it. Nothing is persisted or uploaded —
 * a hard reload of /preview simply clears it (consistent with "nothing stored").
 */
@Injectable({ providedIn: 'root' })
export class PreviewStore {
  /** The story to visualise client-side, or null if none is staged. */
  readonly story = signal<CelestoryStory | null>(null);
  /** True right after an upload, so /preview plays the processing reveal once. */
  readonly fresh = signal(false);
  /** True when the user chose "Create" — /preview auto-opens the publish flow. */
  readonly autoPublish = signal(false);
}
