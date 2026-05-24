import { Injectable } from '@angular/core';

/**
 * Coordinates "export the currently visible card" between siblings:
 * the inspector's Export panel calls `trigger()`, and whichever preview
 * is currently mounted (CardPreview / StellarMapPreview) has registered
 * its own `exportCard` callback. Only one preview is mounted at a time
 * thanks to the shell's mode `@if`, so a single-slot registry is enough.
 */
@Injectable({ providedIn: 'root' })
export class ExportCoordinatorService {
  private exporter: (() => void) | null = null;

  /**
   * Registers the active preview's export callback. Returns an
   * unregister function that the caller must invoke on destroy. A
   * second `register()` before the first is unregistered wins — the
   * new preview replaces the stale one.
   */
  register(exporter: () => void): () => void {
    this.exporter = exporter;
    return () => {
      if (this.exporter === exporter) {
        this.exporter = null;
      }
    };
  }

  /** Invokes the registered exporter if any; no-op otherwise. */
  trigger(): void {
    this.exporter?.();
  }
}
