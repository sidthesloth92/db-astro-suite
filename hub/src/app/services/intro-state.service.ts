import { Injectable, signal } from '@angular/core';

/**
 * Tracks whether the hub landing-page intro animation has already played during
 * the current app session.
 *
 * The hub home page is a route component that Angular destroys on navigate-away
 * and recreates on Back, which would otherwise replay the crescent-logo drift-in
 * and the staged content reveal on every return. This flag lives at the root
 * singleton level so it survives in-app navigation but resets on a genuine full
 * page reload — exactly the lifetime needed to "play the intro once per session".
 */
@Injectable({ providedIn: 'root' })
export class IntroStateService {
  /** Whether the landing-page intro has already played this session. */
  private readonly introPlayed = signal(false);

  /** Read-only view of whether the intro has played this session. */
  readonly hasIntroPlayed = this.introPlayed.asReadonly();

  /** Marks the intro as having played so subsequent visits skip it. */
  markIntroPlayed(): void {
    this.introPlayed.set(true);
  }
}
