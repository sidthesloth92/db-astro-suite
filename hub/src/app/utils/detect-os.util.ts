import type { DetectedOs } from './detect-os.types';

/**
 * Best-effort OS detection from a user-agent string. Returns `''` when the
 * UA matches none of the supported platforms, so callers can keep their
 * default selection.
 */
export function detectOsFromUserAgent(userAgent: string): DetectedOs {
  const ua = userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return '';
}
