import type { ServerResponse } from 'node:http';

/**
 * Set the HTTP status of the server-rendered page (e.g. 404 for a missing
 * profile, 503 while the database is down) so crawlers see the real outcome.
 * No-op in the browser, where there is no server response.
 */
export function setSsrStatus(response: ServerResponse | null, status: number): void {
  if (response && !response.headersSent) {
    response.statusCode = status;
  }
}
