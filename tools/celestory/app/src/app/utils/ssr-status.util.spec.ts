import type { ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { setSsrStatus } from './ssr-status.util';

describe('setSsrStatus', () => {
  it('sets the status on the server response', () => {
    const response = { statusCode: 200, headersSent: false } as ServerResponse;
    setSsrStatus(response, 404);
    expect(response.statusCode).toBe(404);
  });

  it('leaves a response that was already sent alone', () => {
    const response = { statusCode: 200, headersSent: true } as ServerResponse;
    setSsrStatus(response, 503);
    expect(response.statusCode).toBe(200);
  });

  it('is a no-op in the browser (no response)', () => {
    expect(() => setSsrStatus(null, 404)).not.toThrow();
  });
});
