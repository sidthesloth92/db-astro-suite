import { SUPPORTED_LEDGER_SCHEMA_VERSION } from '../models/ledger.constants';
import type { CelestoryLedger } from '../models/ledger.model';

/** Outcome of reading/validating an uploaded celestory.json file. */
export type ReadLedgerResult =
  | { ok: true; ledger: CelestoryLedger }
  | { ok: false; error: string };

/** Generic invalid-file message, shared by every upload entry point. */
const INVALID_FILE_MESSAGE = 'That file isn’t a valid celestory.json export.';

/**
 * Build the message shown when a ledger's schema version doesn't match what this
 * app renders — almost always an older CLI. Surfaces the producing CLI version
 * when present so the user knows what they ran.
 */
function outdatedSchemaMessage(ledger: CelestoryLedger): string {
  const usedVersion = ledger.tool?.version ? ` (you used celestory ${ledger.tool.version})` : '';
  return (
    `This celestory.json was made by an older Celestory CLI${usedVersion}. ` +
    'Update to the latest version and re-scan your library to regenerate it.'
  );
}

/** Parse, shape-check and schema-check a celestory.json string. */
export function parseLedgerText(text: string): ReadLedgerResult {
  let parsed: CelestoryLedger;
  try {
    parsed = JSON.parse(text) as CelestoryLedger;
  } catch {
    return { ok: false, error: INVALID_FILE_MESSAGE };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.summary) {
    return { ok: false, error: INVALID_FILE_MESSAGE };
  }
  // Reject ledgers from an older/newer CLI before rendering, so the user gets a
  // clear "update & regenerate" prompt instead of a broken view.
  if (parsed.schemaVersion != SUPPORTED_LEDGER_SCHEMA_VERSION) {
    return { ok: false, error: outdatedSchemaMessage(parsed) };
  }
  return { ok: true, ledger: parsed };
}

/** Read a chosen/dropped File and parse it as a ledger (browser FileReader). */
export function readLedgerFile(file: File): Promise<ReadLedgerResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseLedgerText(String(reader.result)));
    reader.onerror = () => resolve({ ok: false, error: 'Could not read that file.' });
    reader.readAsText(file);
  });
}
