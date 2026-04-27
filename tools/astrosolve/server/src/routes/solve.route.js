import PQueue from "p-queue";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import config from "../config.js";
import { SolveError } from "../errors.js";
import { parseMultipartRequest } from "../services/upload.service.js";
import { processSolveRequest } from "../services/solve.service.js";
import { validateKey } from "../access-key.service.js";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const ACCESS_KEYS_DB_PATH = path.join(DATA_DIR, "access-keys.sqlite");

// Concurrency queue to protect backend execution.
const solveQueue = new PQueue({ concurrency: config.queueConcurrency });

/**
 * Fastify route plugin — registers the POST /api/v1/solve endpoint.
 * Handles request parsing, queue management, and response mapping only.
 * All business logic is delegated to the solve service.
 */
export default async function (fastify) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  let accessKeyDb = null;
  if (config.solveApiKeyRequired) {
    accessKeyDb = new Database(ACCESS_KEYS_DB_PATH);
  }

  const routeOptions = {};

  if (config.solveApiKeyRequired) {
    routeOptions.preHandler = async (request, reply) => {
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
      let valid = false;
      try {
        valid = validateKey(accessKeyDb, key);
      } catch (err) {
        request.log.error(
          { err, dbPath: ACCESS_KEYS_DB_PATH },
          "access-key preHandler: DB error during key validation",
        );
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Invalid or missing access key",
          details: {},
        });
      }

      if (!valid) {
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

      request.log.info(
        { keyHashPrefix: keyHash.slice(0, 12) + "..." },
        "access-key preHandler: key validated OK",
      );
    };
  }

  fastify.post("/api/v1/solve", routeOptions, async (request, reply) => {
    try {
      fastify.log.info("Parsing multipart request...");
      const { filePath, hints } = await parseMultipartRequest(request, UPLOADS_DIR);
      fastify.log.info(`Multipart parsed, starting queue for ${filePath}`);

      if (solveQueue.size + solveQueue.pending >= config.queueMaxSize) {
        await fs.unlink(filePath).catch(() => {});
        return reply.code(503).send({
          code: "SERVER_BUSY",
          message: "Solver queue is full. Please retry in a minute.",
          details: {},
        });
      }

      const result = await solveQueue.add(async () => {
        try {
          request.log.info("Queue executing processSolveRequest...");
          const res = await processSolveRequest(filePath, hints, request.log);
          request.log.info("processSolveRequest completed.");
          return res;
        } finally {
          await fs.unlink(filePath).catch((err) => {
            if (err.code !== "ENOENT") {
              request.log.error(
                { err, filePath },
                "Failed to delete uploaded file after processing",
              );
            }
          });
        }
      });

      request.log.info("Sending reply...");
      return reply.send({
        status: "success",
        metadata: result.metadata,
        objects: result.objects,
        ...(result.warnings?.length ? { warnings: result.warnings } : {}),
      });
    } catch (e) {
      if (e instanceof SolveError) {
        return reply.code(e.statusCode).send({
          code: "VALIDATION_ERROR",
          message: e.message,
          details: {},
        });
      }

      fastify.log.error(e);
      return reply.code(500).send({
        code: "SOLVE_FAILED",
        message: "Internal processing error during astrometry solving.",
        details: {},
      });
    }
  });
}
