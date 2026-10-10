import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config';
import type { SessionPayload } from './session.model';

/**
 * Stateless owner management session tokens. A token authorizes edit/delete for
 * a single story instance and is minted once the owner proves the profile
 * password (login) or right after a successful publish/update. It is an
 * HMAC-signed `base64url(payload).base64url(signature)` string — no server-side
 * session store. The client holds it in sessionStorage (per browser tab).
 */

/** Lifetime of a management session token (12 hours, in ms). */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** HMAC-SHA256 of the encoded payload using the configured session secret. */
function sign(payloadB64: string): string {
  return createHmac('sha256', config.sessionSecret).update(payloadB64).digest('base64url');
}

/** Mint a signed management token bound to a handle + story id. */
export function signSession(handle: string, storyId: string): string {
  const payload: SessionPayload = { handle, sid: storyId, exp: Date.now() + SESSION_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Decode + verify a token's signature and expiry, returning its payload, or
 * null on any malformed/expired/tampered input. Never throws. Callers match the
 * payload's `handle`/`sid` against the targeted story.
 */
export function readSession(token: string): SessionPayload | null {
  const [payloadB64, presentedSig] = (token || '').split('.');
  if (!payloadB64 || !presentedSig) {
    return null;
  }
  const expected = Buffer.from(sign(payloadB64));
  const presented = Buffer.from(presentedSig);
  if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as SessionPayload;
    if (
      !payload ||
      typeof payload.handle !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** True when the token is valid and authorizes management of this exact story. */
export function authorizeSession(token: string, handle: string, storyId: string): boolean {
  const payload = readSession(token);
  return !!payload && payload.handle === handle && payload.sid === storyId;
}

/** Extract a bearer token from an `Authorization` header value, or '' if absent. */
export function extractBearer(authorization: string | undefined): string {
  if (!authorization) {
    return '';
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : '';
}
