import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Mint a fresh capability key — 256 bits of CSPRNG entropy, base64url-encoded.
 * Returned to the user exactly once at create time; only its hash is stored.
 */
export function generateKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a key for at-rest storage. SHA-256 is correct here: the input is a
 * high-entropy random token, not a low-entropy password, so no KDF is needed.
 */
export function hashKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of a presented key against a stored hash.
 * Returns false (never throws) on any malformed input.
 */
export function verifyKey(presentedKey: string, storedHash: string): boolean {
  const presentedHash = hashKey(presentedKey);
  const a = Buffer.from(presentedHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
