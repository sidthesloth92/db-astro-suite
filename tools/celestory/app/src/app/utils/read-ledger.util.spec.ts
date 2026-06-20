import { describe, expect, it } from 'vitest';
import { SUPPORTED_LEDGER_SCHEMA_VERSION } from '../models/ledger.constants';
import { parseLedgerText } from './read-ledger.util';

/** Minimal ledger JSON accepted by parseLedgerText. */
function validLedgerJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: SUPPORTED_LEDGER_SCHEMA_VERSION,
    generatedAt: '2026-06-17T00:00:00Z',
    tool: { name: 'celestory', version: '1.0.0' },
    summary: { totalIntegrationSeconds: 3600, objectCount: 1, nightCount: 1, lightFrameCount: 10 },
    objects: [],
    equipment: [],
    ...overrides,
  });
}

describe('parseLedgerText', () => {
  it('accepts a well-formed current-schema ledger', () => {
    const result = parseLedgerText(validLedgerJson());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ledger.summary.objectCount).toBe(1);
    }
  });

  it('rejects invalid JSON', () => {
    const result = parseLedgerText('{ not json');
    expect(result).toEqual({ ok: false, error: expect.stringContaining('valid celestory.json') });
  });

  it('rejects a JSON object missing the summary block', () => {
    const result = parseLedgerText(JSON.stringify({ schemaVersion: SUPPORTED_LEDGER_SCHEMA_VERSION }));
    expect(result.ok).toBe(false);
  });

  it('rejects an older-schema ledger with an upgrade message', () => {
    const result = parseLedgerText(validLedgerJson({ schemaVersion: SUPPORTED_LEDGER_SCHEMA_VERSION - 1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('older Celestory CLI');
      expect(result.error).toContain('1.0.0');
    }
  });
});
