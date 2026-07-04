import { setResponseStatus, type H3Event } from 'h3';
import { CelestoryError } from './celestory.error';
import type { ApiResponse } from './api.types';

/** Build a success envelope with an explicit code and details. */
export function success<TDetails extends Record<string, unknown>>(
  code: string,
  message: string,
  details: TDetails,
): ApiResponse<TDetails> {
  return { code, message, details };
}

/**
 * Map any thrown error to the standard envelope and set the HTTP status.
 * Known CelestoryErrors map to their code/status; anything else becomes a
 * generic 500 so internal details never leak to the client.
 */
export function toErrorResponse(event: H3Event, error: unknown): ApiResponse {
  if (error instanceof CelestoryError) {
    setResponseStatus(event, error.statusCode);
    return { code: error.code, message: error.message, details: error.details };
  }

  setResponseStatus(event, 500);
  return {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
    details: {},
  };
}
