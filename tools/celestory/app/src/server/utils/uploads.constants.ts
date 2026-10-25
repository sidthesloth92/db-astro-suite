/** Validation rules for anonymous upload pings. */

/** CLI install id: 128 random bits, hex-encoded (cli/internal/config/config.go). */
export const INSTALL_ID_PATTERN = /^[0-9a-f]{32}$/;

/** CLI data fingerprint: SHA-256 hex (cli/internal/fingerprint/fingerprint.go). */
export const DATA_FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;

/** Largest plausible total integration in one ping: 100,000 hours. */
export const MAX_PING_INTEGRATION_SECONDS = 360_000_000;

/** Largest plausible light-frame count in one ping. */
export const MAX_PING_LIGHT_FRAMES = 10_000_000;
