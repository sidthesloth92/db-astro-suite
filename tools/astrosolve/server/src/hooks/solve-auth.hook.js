import crypto from "crypto";
import { validateKey, incrementUseCount } from "../access-key.service.js";

/**
 * Returns a Fastify preHandler that validates the x-access-key header
 * against the access-keys database.
 *
 * @param {object} config - Application config object
 * @param {import('better-sqlite3').Database} db - Open better-sqlite3 database instance
 * @returns {(request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>}
 */
// config is intentionally kept in the signature for forward-compatibility (e.g. rate-limit config)
export function solveAuthHook(config, db) {
  return async function (request, reply) {
    const key = request.headers["x-access-key"];

    if (!key) {
      request.log.warn("access-key preHandler: x-access-key header missing");
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid or missing access key",
        details: {},
      });
    }

    const keyHash = crypto.createHash("sha256").update(key).digest("hex");
    let keyId = null;
    try {
      keyId = validateKey(db, key);
    } catch (err) {
      request.log.error(
        { err, dbPath: db.name },
        "access-key preHandler: DB error during key validation",
      );
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid or missing access key",
        details: {},
      });
    }

    if (keyId == null) {
      request.log.warn(
        { keyHashPrefix: keyHash.slice(0, 12) + "..." },
        "access-key preHandler: key not found or inactive",
      );
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid or missing access key",
        details: {},
      });
    }

    try {
      incrementUseCount(db, keyId);
      request.log.debug({ keyId }, "access-key preHandler: use_count incremented");
    } catch (err) {
      request.log.error(
        { err },
        "access-key preHandler: failed to increment use_count",
      );
    }

    request.log.info(
      { keyHashPrefix: keyHash.slice(0, 12) + "..." },
      "access-key preHandler: key validated OK",
    );
  };
}
