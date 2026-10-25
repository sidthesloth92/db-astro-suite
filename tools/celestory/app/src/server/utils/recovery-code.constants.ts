/** Format of one-time profile recovery codes. */

/**
 * 32 symbols: digits plus letters without I, L, O and U (Crockford base32),
 * so a code read aloud or written down can't be mistaken (0/O, 1/I/L).
 */
export const RECOVERY_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Characters per code: 20 × 5 bits = 100 bits of randomness. */
export const RECOVERY_CODE_LENGTH = 20;

/** Characters per dash-separated display group (XXXXX-XXXXX-XXXXX-XXXXX). */
export const RECOVERY_CODE_GROUP_SIZE = 5;
