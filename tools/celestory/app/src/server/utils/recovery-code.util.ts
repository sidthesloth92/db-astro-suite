import { randomBytes } from 'node:crypto';
import {
  RECOVERY_CODE_ALPHABET,
  RECOVERY_CODE_GROUP_SIZE,
  RECOVERY_CODE_LENGTH,
} from './recovery-code.constants';

/**
 * Generate a new recovery code in normalized form (20 uppercase symbols, no
 * dashes). Each random byte maps to one of 32 symbols; 256 is a multiple of 32,
 * so the mapping is unbiased.
 */
export function generateRecoveryCode(): string {
  return Array.from(
    randomBytes(RECOVERY_CODE_LENGTH),
    (byte) => RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length],
  ).join('');
}

/** Display form of a normalized code, e.g. `K7Q2M-9XH4T-R3WPA-6ZD8N`. */
export function formatRecoveryCode(code: string): string {
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += RECOVERY_CODE_GROUP_SIZE) {
    groups.push(code.slice(i, i + RECOVERY_CODE_GROUP_SIZE));
  }
  return groups.join('-');
}

/**
 * Normalize what a user typed into the stored form: uppercase, spaces and
 * dashes dropped, and the look-alikes the alphabet excludes read as digits
 * (O → 0, I/L → 1). Returns '' when the result isn't a well-formed code.
 */
export function normalizeRecoveryCode(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  const wellFormed =
    code.length === RECOVERY_CODE_LENGTH &&
    [...code].every((symbol) => RECOVERY_CODE_ALPHABET.includes(symbol));
  return wellFormed ? code : '';
}
