import { createHmac } from 'node:crypto';
import { getRequestIP, type H3Event } from 'h3';
import { config } from './config';

/**
 * Keyed hash of a client IP so rate-limit rows never hold a raw address. HMAC
 * with the server secret (domain-separated by an `rl:` prefix) means the
 * stored value can't be reversed by hashing the IPv4 space.
 */
export function hashClientIp(ip: string): string {
  return createHmac('sha256', config.sessionSecret)
    .update(`rl:${ip.trim()}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Rate-limit subject for the caller's IP, e.g. `ip:3f9a…`. Vercel overwrites
 * `x-forwarded-for` with the real client IP, so it can't be spoofed while the
 * domain is DNS-only (no proxy in front). Requests with no IP share one bucket.
 */
export function clientIpSubject(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
  return `ip:${hashClientIp(ip)}`;
}
