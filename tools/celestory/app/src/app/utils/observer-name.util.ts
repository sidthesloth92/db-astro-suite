import { OBSERVER_PLACE_SEPARATOR } from '../models/observer.constants';

/** The name part of an `observer` line ("Name — Place" → "Name"), or ''. */
export function observerName(observer: string | undefined): string {
  return (observer ?? '').split(OBSERVER_PLACE_SEPARATOR)[0].trim();
}

/**
 * Replace the name in an `observer` line, keeping any "— Place" part:
 * ("Vera — Atacama", "Vera C.") → "Vera C. — Atacama"; ("", "Vera") → "Vera".
 * Shared by the publish dialog and the server's rename route.
 */
export function observerWithName(current: string | undefined, name: string): string {
  const place = (current ?? '').split(OBSERVER_PLACE_SEPARATOR)[1]?.trim() ?? '';
  const trimmed = name.trim();
  return place ? `${trimmed} ${OBSERVER_PLACE_SEPARATOR} ${place}` : trimmed;
}
