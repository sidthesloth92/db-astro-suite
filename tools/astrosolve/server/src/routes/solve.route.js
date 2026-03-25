import PQueue from "p-queue";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { imageSize } from "image-size";
import config from "../config.js";
import { SolveError } from "../errors.js";
import { processSolveRequest } from "../services/solve.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Concurrency queue to protect backend execution.
const solveQueue = new PQueue({ concurrency: config.queueConcurrency });

/**
 * Validates the hints before allowing the image stream to proceed.
 * @param {Object} fields - Extracted multipart fields
 * @returns {Object} Clean hints object
 */
function validateAndExtractHints(fields) {
  const typesField = fields.types ? fields.types.value : null;
  const types = typesField ? typesField.split(",").map((t) => t.trim()) : [];

  return {
    min_magnitude: 20,
    types: types,
  };
}

/**
 * Validates that an image file was provided in the multipart request and has an allowed extension.
 * @param {Object} data - The Fastify multipart file object
 */
function validateImageReceived(data) {
  if (!data || !data.file) {
    throw new SolveError(400, "Missing 'image' file in multipart payload.");
  }

  const allowedExtensions = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(data.filename).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new SolveError(
      400,
      `Invalid file extension: ${ext}. Only .jpg, .jpeg, and .png are allowed.`,
    );
  }
}

/**
 * Parses the Fastify multipart request, validating hints first before streaming the image to disk.
 *
 * @param {Object} request - The Fastify request object
 * @returns {Promise<{filePath: string|null, hints: Object}>}
 */
async function parseMultipartRequest(request) {
  const data = await request.file();

  validateImageReceived(data);
  const hints = validateAndExtractHints(data.fields);

  const ext = path.extname(data.filename) || ".jpg";
  const uniqueId = crypto.randomUUID();
  const filePath = path.join(UPLOADS_DIR, `${uniqueId}${ext}`);

  await pipeline(data.file, createWriteStream(filePath));

  try {
    const stats = await fs.stat(filePath);
    request.log.info(
      `Saved upload to ${filePath}. File size on disk: ${stats.size} bytes.`,
    );

    if (stats.size === 0) {
      throw new SolveError(400, "Uploaded file is 0 bytes. Stream was empty.");
    }

    const fileBuffer = await fs.readFile(filePath);
    const dimensions = imageSize(new Uint8Array(fileBuffer));
    if (!dimensions || dimensions.width < 100 || dimensions.height < 100) {
      await fs.unlink(filePath).catch(() => {});
      throw new SolveError(
        400,
        `Image resolution is too low (${dimensions?.width}x${dimensions?.height}).`,
      );
    }
  } catch (err) {
    if (err instanceof SolveError) {
      throw err;
    }
    await fs.unlink(filePath).catch(() => {});
    request.log.error(err, "Failed to parse image dimensions");
    throw new SolveError(
      400,
      "Uploaded image file appears to be corrupted or in an unsupported format.",
    );
  }

  return { filePath, hints };
}

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
      const { filePath, hints } = await parseMultipartRequest(request);
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
            request.log.error(
              { err, filePath },
              "Failed to delete uploaded file after processing",
            );
          });
        }
      });

      request.log.info("Sending reply...");
      return reply.send({
        code: "OK",
        message: "Solve complete",
        details: {
          metadata: result.metadata,
          objects: result.objects,
          ...(result.warnings.length ? { warnings: result.warnings } : {}),
        },
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
