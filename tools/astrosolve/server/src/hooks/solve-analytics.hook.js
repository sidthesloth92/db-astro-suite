import {
  recordEvent,
  outcomeFromStatus,
} from "../services/solve-event.service.js";
import { SOLVE_EVENT_COLUMNS } from "../models/solve-event.model.js";
import { SolveEventDao } from "../dao/solve-event.dao.js";

/**
 * Fastify onRequest hook: initializes a request-scoped analytics accumulator.
 * Subsequent code paths (auth hook, route handler, services) populate fields
 * on `request.analytics` as the request progresses.
 *
 * @param {import('fastify').FastifyRequest} request
 */
export async function initSolveAnalytics(request) {
  request.analytics = {
    startedAt: Date.now(),
    request_id: request.id,
    client_ip: request.ip ?? null,
    user_agent: request.headers["user-agent"] ?? null,
    // Per-3rd-party-system diagnostic payload. Stays empty on clean runs;
    // serialised to JSON and written to `solve_events.diagnostics` only
    // when at least one subsystem (astrometry, simbad, local catalog)
    // reported a non-OK result.
    diagnostics: {},
  };
}

/**
 * Returns a Fastify onResponse hook that persists the accumulated analytics
 * row. Best-effort — any DAO failure is logged and swallowed.
 *
 * @param {SolveEventDao} solveEventDao
 */
export function recordSolveAnalytics(solveEventDao) {
  return async function (request, reply) {
    const a = request.analytics;
    if (!a) return;

    const httpStatus = reply.statusCode;
    // Serialise diagnostics if and only if at least one subsystem
    // contributed. Otherwise leave the column NULL so the common path
    // stays clean and `WHERE diagnostics IS NOT NULL` cheaply filters
    // the rows worth investigating.
    const diagnostics =
      a.diagnostics && Object.keys(a.diagnostics).length > 0
        ? JSON.stringify(a.diagnostics)
        : null;
    const event = {
      ...pickColumns(a),
      http_status: httpStatus,
      response_code: a.response_code ?? inferResponseCode(httpStatus),
      outcome: a.outcome ?? outcomeFromStatus(httpStatus),
      total_duration_ms: Date.now() - a.startedAt,
      diagnostics,
    };

    recordEvent(solveEventDao, event, request.log);
    request.log.info({ event }, "solve_event");
  };
}

function pickColumns(accumulator) {
  const out = {};
  for (const col of SOLVE_EVENT_COLUMNS) {
    if (accumulator[col] !== undefined) out[col] = accumulator[col];
  }
  return out;
}

function inferResponseCode(status) {
  if (status >= 200 && status < 300) return "SOLVE_SUCCESS";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 503) return "SERVER_BUSY";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "SOLVE_FAILED";
}
