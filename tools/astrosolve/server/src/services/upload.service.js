import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import crypto from "crypto";
import { imageSize } from "image-size";
import config from "../config.js";
import { SolveError } from "../models/errors.model.js";

// Magic-byte signatures for the formats we accept. The byte sequences are
// the official format identifiers — matching these rules out e.g. a .gif
// or .zip renamed to .jpg, which the extension check alone cannot catch.
const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function matchesSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Asserts that the file's leading bytes match the format implied by its
 * extension. Cheap defence against extension spoofing.
 *
 * @param {Buffer|Uint8Array} buffer - First chunk of the saved file (>=8 bytes is plenty).
 * @param {string} ext - Lowercase dot-prefixed extension (e.g. ".jpg").
 * @throws {SolveError} 400 if the contents do not match the extension.
 */
export function validateMagicBytes(buffer, ext) {
  const expected =
    ext === ".jpg" || ext === ".jpeg"
      ? MAGIC_BYTES.jpeg
      : ext === ".png"
        ? MAGIC_BYTES.png
        : null;
  if (!expected) {
    // No signature registered for this extension. The extension allowlist
    // should already have rejected anything we don't know how to sniff, so
    // reaching here means the allowlist drifted from the magic-byte table.
    throw new SolveError(
      400,
      `No content signature configured for extension ${ext}.`,
    );
  }
  if (!matchesSignature(buffer, expected)) {
    throw new SolveError(
      400,
      `File contents do not match the ${ext} extension.`,
    );
  }
}

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
 * Validates that an image file was provided in the multipart request and
 * has an allowed extension. Reads the allowlist from config so ops can
 * widen/narrow it via ASTROSOLVE_UPLOAD_ALLOWED_EXTENSIONS.
 *
 * @param {Object} data - The Fastify multipart file object
 */
export function validateImageReceived(data) {
  if (!data || !data.file) {
    throw new SolveError(400, "Missing 'image' file in multipart payload.");
  }

  const allowed = config.uploadAllowedExtensions;
  const ext = path.extname(data.filename).toLowerCase();

  if (!allowed.includes(ext)) {
    throw new SolveError(
      400,
      `Invalid file extension: ${ext}. Allowed: ${allowed.join(", ")}.`,
    );
  }
}

/**
 * Asserts that decoded image dimensions fall within the configured
 * min/max range on both axes. Min protects solve success rate; max is a
 * decompression-bomb defence (a small file can decode to gigabytes).
 *
 * @param {{ width: number, height: number } | null | undefined} dimensions
 * @throws {SolveError} 400 if dimensions are missing or out of range.
 */
export function validateDimensions(dimensions) {
  if (!dimensions || !dimensions.width || !dimensions.height) {
    throw new SolveError(
      400,
      "Image dimensions could not be determined.",
    );
  }
  const { width, height } = dimensions;
  const min = config.uploadMinDimension;
  const max = config.uploadMaxDimension;
  if (width < min || height < min) {
    throw new SolveError(
      400,
      `Image resolution is too low (${width}x${height}). Minimum ${min}x${min} required on both axes.`,
    );
  }
  if (width > max || height > max) {
    throw new SolveError(
      400,
      `Image resolution is too high (${width}x${height}). Maximum ${max}x${max} allowed on both axes.`,
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
    // Magic-byte sniff before any decoder touches the buffer — catches a
    // mislabelled extension up front rather than letting it fall out of
    // image-size as a "corrupt file" error.
    try {
      validateMagicBytes(fileBuffer, ext);
    } catch (err) {
      await fs.unlink(filePath).catch(() => {});
      throw err;
    }

    const dimensions = imageSize(new Uint8Array(fileBuffer));
    try {
      validateDimensions(dimensions);
    } catch (err) {
      await fs.unlink(filePath).catch(() => {});
      throw err;
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
