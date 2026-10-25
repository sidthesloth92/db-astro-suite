import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { loadFailure } from './load-failure.util';

describe('loadFailure', () => {
  it('treats only a 404 as "not found"', () => {
    expect(loadFailure(new HttpErrorResponse({ status: 404 }))).toBe('not-found');
  });

  it('recognises a 404 from the SSR fetch layer too (FetchError-style statusCode)', () => {
    expect(loadFailure({ statusCode: 404, message: '[GET] /api/v1/stories/x: 404' })).toBe('not-found');
    expect(loadFailure({ status: 404 })).toBe('not-found');
    expect(loadFailure({ statusCode: 500 })).toBe('unavailable');
  });

  it('treats server errors, timeouts and offline as "unavailable", never "not found"', () => {
    expect(loadFailure(new HttpErrorResponse({ status: 500 }))).toBe('unavailable');
    expect(loadFailure(new HttpErrorResponse({ status: 503 }))).toBe('unavailable');
    expect(loadFailure(new HttpErrorResponse({ status: 0 }))).toBe('unavailable');
    expect(loadFailure(new Error('boom'))).toBe('unavailable');
  });
});
