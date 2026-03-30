import PQueue from "p-queue";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config.js";
import { SolveError } from "../errors.js";
import { parseMultipartRequest } from "../services/upload.service.js";
import { processSolveRequest } from "../services/solve.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Concurrency queue to protect backend execution.
const solveQueue = new PQueue({ concurrency: config.queueConcurrency });

/**
 * Fastify route plugin — registers the POST /api/v1/solve endpoint.
 * Handles request parsing, queue management, and response mapping only.
 * All business logic is delegated to the solve service.
 */
export default async function (fastify) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  fastify.post("/api/v1/solve", async (request, reply) => {
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
