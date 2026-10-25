import { describe, expect, it } from 'vitest';
import {
  formatRecoveryCode,
  generateRecoveryCode,
  normalizeRecoveryCode,
} from './recovery-code.util';
import { RECOVERY_CODE_ALPHABET, RECOVERY_CODE_LENGTH } from './recovery-code.constants';

describe('generateRecoveryCode', () => {
  it('makes a 20-symbol code from the unambiguous alphabet', () => {
    const code = generateRecoveryCode();
    expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
    expect([...code].every((symbol) => RECOVERY_CODE_ALPHABET.includes(symbol))).toBe(true);
    expect(code).not.toMatch(/[ILOU]/);
  });

  it('does not repeat codes', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRecoveryCode()));
    expect(codes.size).toBe(200);
  });
});

describe('formatRecoveryCode', () => {
  it('groups the code in fives for display', () => {
    expect(formatRecoveryCode('K7Q2M9XH4TR3WPA6ZD8N')).toBe('K7Q2M-9XH4T-R3WPA-6ZD8N');
  });
});

describe('normalizeRecoveryCode', () => {
  it('accepts the displayed form and round-trips a generated code', () => {
    const code = generateRecoveryCode();
    expect(normalizeRecoveryCode(formatRecoveryCode(code))).toBe(code);
  });

  it('forgives lower case, spaces and missing dashes', () => {
    expect(normalizeRecoveryCode(' k7q2m 9xh4t r3wpa 6zd8n ')).toBe('K7Q2M9XH4TR3WPA6ZD8N');
  });

  it('reads the look-alike letters O, I and L as digits', () => {
    expect(normalizeRecoveryCode('K7Q2M-9XH4T-R3WPA-6ZD8O')).toBe('K7Q2M9XH4TR3WPA6ZD80');
    expect(normalizeRecoveryCode('K7Q2M-9XH4T-R3WPA-6ZDIL')).toBe('K7Q2M9XH4TR3WPA6ZD11');
  });

  it('rejects malformed input', () => {
    expect(normalizeRecoveryCode('K7Q2M-9XH4T')).toBe('');
    expect(normalizeRecoveryCode('K7Q2M-9XH4T-R3WPA-6ZD8U')).toBe('');
    expect(normalizeRecoveryCode(undefined)).toBe('');
  });
});
