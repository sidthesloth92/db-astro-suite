import {
  validateKey,
  incrementUseCount,
} from "../services/access-key.service.js";
import { AccessKeyDao } from "../dao/access-key.dao.js";
import { SolveEventOutcome } from "../models/solve-event.model.js";

/**
 * Returns a Fastify preHandler that validates the x-access-key header
 * against the access-keys database.
 *
 * @param {object} config - Application config object (kept for forward-compatibility)
 * @param {AccessKeyDao} accessKeyDao - DAO instance for access key operations
 * @returns {(request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>}
 */
// config is intentionally kept in the signature for forward-compatibility (e.g. rate-limit config)
export function solveAuthHook(config, accessKeyDao) {
  return async function (request, reply) {
    const a = request.analytics;
    const key = request.headers["x-access-key"];

    if (!key) {
      request.log.warn("access-key preHandler: x-access-key header missing");
      recordAuthFailure(request, a, "x-access-key header missing");
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid or missing access key",
        details: {},
      });
    }

    let keyId = null;
    try {
      keyId = validateKey(accessKeyDao, key);
    } catch (err) {
      request.log.error(
        { err },
        "access-key preHandler: DB error during key validation",
      );
      recordAuthFailure(
        request,
        a,
        `DB error during key validation: ${err.message}`,
      );
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid or missing access key",
        details: {},
      });
    }

    if (keyId == null) {
      request.log.warn("access-key preHandler: key not found or inactive");
      recordAuthFailure(request, a, "Key not found or inactive");
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid or missing access key",
        details: {},
      });
    }

    if (a) {
      request.analytics = { ...a, key_id: keyId };
    }

    try {
      incrementUseCount(accessKeyDao, keyId);
      request.log.debug(
        { keyId },
        "access-key preHandler: use_count incremented",
      );
    } catch (err) {
      request.log.error(
        { err },
        "access-key preHandler: failed to increment use_count",
      );
    }

    request.log.info({ keyId }, "access-key preHandler: key validated OK");
  };
}

/**
 * Replaces `request.analytics` with a new object carrying the auth-failure
 * outcome / response code / error message. Treating analytics as immutable
 * (replace via spread, never mutate in place) keeps the rest of the request
 * pipeline from accidentally observing partial state.
 *
 * @param {import('fastify').FastifyRequest} request
 * @param {Object | undefined} analytics - Current request.analytics (may be undefined)
 * @param {string} errorMessage - Operator-facing failure context
 */
function recordAuthFailure(request, analytics, errorMessage) {
  if (!analytics) return;
  request.analytics = {
    ...analytics,
    outcome: SolveEventOutcome.AUTH_FAILED,
    response_code: "UNAUTHORIZED",
    error_message: errorMessage,
  };
}
