/**
 * Client-side view of the Celestory ledger — the subset the UI renders.
 * Mirrors the CLI contract (tools/celestory/internal/model/ledger.model.go).
 */

/** Per-filter integration total. */
export interface LedgerFilter {
  name: string;
  seconds: number;
}

/** One imaged target. */
export interface LedgerObject {
  id: string;
  displayName?: string;
  designation: string;
  category: string;
  totalIntegrationSeconds: number;
  lightFrameCount: number;
  nightCount: number;
}

/** One camera or optic. */
export interface LedgerEquipment {
  id: string;
  kind: string;
  displayName: string;
  totalIntegrationSeconds: number;
}

/** Hero/summary stats. */
export interface LedgerSummary {
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
  firstLight: string;
  latestSession: string;
  filters: LedgerFilter[];
}

/** The root ledger document (UI subset). */
export interface CelestoryLedger {
  schemaVersion: number;
  summary: LedgerSummary;
  objects: LedgerObject[];
  equipment: LedgerEquipment[];
}
