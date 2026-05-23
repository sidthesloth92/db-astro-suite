import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import crypto from "crypto";
import { imageSize } from "image-size";
import config from "../config.js";
import { SolveError } from "../models/errors.model.js";

/**
 * Validates the hints before allowing the image stream to proceed.
 * Extracts pre-file multipart fields (types, ra_hint, dec_hint).
 *
 * @param {Object} fields - Extracted multipart fields
 * @returns {Object} Clean hints object
 */
export function validateAndExtractHints(fields) {
  const typesField = fields.types ? fields.types.value : null;
  const types = typesField ? typesField.split(",").map((t) => t.trim()) : [];

  const raHintRaw = fields.ra_hint ? fields.ra_hint.value : null;
  const decHintRaw = fields.dec_hint ? fields.dec_hint.value : null;
  const raHint = raHintRaw == null ? null : Number(raHintRaw);
  const decHint = decHintRaw == null ? null : Number(decHintRaw);

  return {
    min_magnitude: 20,
    types: types,
    ra_hint: Number.isFinite(raHint) ? raHint : null,
    dec_hint: Number.isFinite(decHint) ? decHint : null,
  };
}

/**
 * Validates that an image file was provided in the multipart request and has an allowed extension.
 * @param {Object} data - The Fastify multipart file object
 */
export function validateImageReceived(data) {
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
 * @param {string} uploadsDir - Absolute path to the directory where uploads are stored
 * @returns {Promise<{
 *   filePath: string,
 *   hints: Object,
 *   fileSizeBytes: number,
 *   imageWidthPx: number,
 *   imageHeightPx: number,
 *   fileExtension: string,
 * }>}
 */
export async function parseMultipartRequest(request, uploadsDir) {
  const data = await request.file();

  validateImageReceived(data);
  const hints = validateAndExtractHints(data.fields);

  const ext = (path.extname(data.filename) || ".jpg").toLowerCase();
  const uniqueId = crypto.randomUUID();
  const filePath = path.join(uploadsDir, `${uniqueId}${ext}`);

  await pipeline(data.file, createWriteStream(filePath));

  try {
    const stats = await fs.stat(filePath);
    request.log.info(
      { filePath, fileSizeBytes: stats.size },
      "Saved upload to disk",
    );

    if (stats.size === 0) {
      await fs.unlink(filePath).catch(() => {});
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

    return {
      filePath,
      hints,
      fileSizeBytes: stats.size,
      imageWidthPx: dimensions.width,
      imageHeightPx: dimensions.height,
      fileExtension: ext,
    };
  } catch (err) {
    if (err instanceof SolveError) {
      throw err;
    }
    await fs.unlink(filePath).catch(() => {});
    request.log.error(err, "Failed to parse image dimensions");
    // Preserve the underlying cause in the SolveError message so it ends up
    // in solve_events.error_message for debugging — otherwise every corrupt-
    // file failure looks identical in analytics.
    const cause = err instanceof Error ? err.message : String(err);
    throw new SolveError(
      400,
      `Uploaded image file appears to be corrupted or in an unsupported format: ${cause}`,
    );
  }
}
