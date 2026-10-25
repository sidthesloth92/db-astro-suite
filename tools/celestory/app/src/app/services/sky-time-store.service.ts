import { computed, Injectable, signal } from '@angular/core';
import { SKY_TIME_RATES } from '../models/sky-time.constants';

/**
 * Simulated time for the planetarium. Live by default (tracks the wall clock);
 * can be paused, run at a multiple of real time, or scrubbed to any instant.
 * Rendering reads `now()` each frame; the UI binds to the throttled `time` signal.
 */
@Injectable({ providedIn: 'root' })
export class SkyTimeStore {
  private anchorRealMs = Date.now();
  private anchorSimMs = Date.now();
  private lastPublishedSecond = 0;

  /** Simulated seconds per real second (0 = paused). */
  readonly rate = signal<number>(1);
  /** The simulated instant, published at most once per simulated second. */
  readonly time = signal<Date>(new Date());
  /** True when tracking the wall clock at 1×. */
  readonly isLive = computed(() => this.rate() === 1 && this.offsetMs() === 0);
  /** Simulated − real time (ms); 0 when live. */
  readonly offsetMs = signal<number>(0);

  /** The simulated instant right now (cheap; call every frame). */
  now(): Date {
    return new Date(this.simMs(Date.now()));
  }

  /** Publish `time` if the displayed second changed (called from the render loop). */
  tick(): void {
    const ms = this.simMs(Date.now());
    const sec = Math.floor(ms / 1000);
    if (sec !== this.lastPublishedSecond) {
      this.lastPublishedSecond = sec;
      this.time.set(new Date(ms));
    }
  }

  /** Set the playback rate (keeps the current simulated instant continuous). */
  setRate(rate: number): void {
    this.reanchor();
    this.rate.set(rate);
    this.publishOffset();
  }

  /** Pause / resume at 1× without jumping. */
  togglePause(): void {
    this.setRate(this.rate() === 0 ? 1 : 0);
  }

  /** Cycle to the next faster rate (wraps to 1×). */
  faster(): void {
    const i = SKY_TIME_RATES.indexOf(this.rate());
    this.setRate(SKY_TIME_RATES[(i + 1) % SKY_TIME_RATES.length]);
  }

  /** Jump to an instant (keeps the rate). */
  setTime(date: Date): void {
    this.anchorRealMs = Date.now();
    this.anchorSimMs = date.getTime();
    this.publishOffset();
    this.time.set(new Date(this.anchorSimMs));
  }

  /** Shift by `ms` of simulated time. */
  shiftBy(ms: number): void {
    this.setTime(new Date(this.simMs(Date.now()) + ms));
  }

  /** Back to live wall-clock time at 1×. */
  resetToNow(): void {
    this.anchorRealMs = Date.now();
    this.anchorSimMs = this.anchorRealMs;
    this.rate.set(1);
    this.publishOffset();
    this.time.set(new Date(this.anchorSimMs));
  }

  private simMs(realMs: number): number {
    return this.anchorSimMs + (realMs - this.anchorRealMs) * this.rate();
  }

  private reanchor(): void {
    const real = Date.now();
    this.anchorSimMs = this.simMs(real);
    this.anchorRealMs = real;
  }

  private publishOffset(): void {
    const real = Date.now();
    this.offsetMs.set(this.rate() === 1 ? Math.round(this.simMs(real) - real) : Number.NaN);
  }
}
