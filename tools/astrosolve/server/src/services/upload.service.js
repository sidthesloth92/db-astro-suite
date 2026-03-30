import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import crypto from "crypto";
import { imageSize } from "image-size";
import config from "../config.js";
import { SolveError } from "../errors.js";

/**
 * Validates the hints before allowing the image stream to proceed.
 * @param {Object} fields - Extracted multipart fields
 * @returns {Object} Clean hints object
 */
export function validateAndExtractHints(fields) {
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
 * @returns {Promise<{filePath: string|null, hints: Object}>}
 */
export async function parseMultipartRequest(request, uploadsDir) {
  const data = await request.file();

  validateImageReceived(data);
  const hints = validateAndExtractHints(data.fields);

  const ext = path.extname(data.filename) || ".jpg";
  const uniqueId = crypto.randomUUID();
  const filePath = path.join(uploadsDir, `${uniqueId}${ext}`);

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
