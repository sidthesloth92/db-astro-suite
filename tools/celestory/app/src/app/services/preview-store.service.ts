import { Injectable, signal } from '@angular/core';
import type { CelestoryLedger } from '../models/ledger.model';

/**
 * In-memory hand-off for the ① Visualise path: the landing page sets the parsed
 * ledger here, the /preview page reads it. Nothing is persisted or uploaded —
 * a hard reload of /preview simply clears it (consistent with "nothing stored").
 */
@Injectable({ providedIn: 'root' })
export class PreviewStore {
  /** The ledger to visualise client-side, or null if none is staged. */
  readonly ledger = signal<CelestoryLedger | null>(null);
}
