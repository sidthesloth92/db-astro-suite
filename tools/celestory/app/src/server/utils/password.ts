import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/** scrypt key length (bytes). */
const KEY_LEN = 32;

/** Minimum acceptable password length. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Hash a low-entropy user password for at-rest storage using scrypt (a memory-
 * hard KDF — correct for passwords, unlike the SHA-256 used for the high-entropy
 * delete key). Returns `salt:hash` (both hex). No external dependency.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/**
 * Verify a presented password against a stored `salt:hash`. Constant-time;
 * returns false (never throws) on any malformed input.
 */
export async function verifyPassword(presented: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = (stored || '').split(':');
  if (!saltHex || !hashHex) {
    return false;
  }
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = (await scryptAsync(presented, salt, expected.length)) as Buffer;
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
