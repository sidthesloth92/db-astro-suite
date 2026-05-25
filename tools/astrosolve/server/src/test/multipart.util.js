/**
 * Tiny helpers for assembling multipart/form-data payloads inside tests.
 *
 * `fastify.inject()` accepts a `payload` Buffer + matching `Content-Type`
 * header — no need for FormData or undici. These helpers build that pair so
 * the tests can stay focused on what behaviour they are exercising.
 */

const CRLF = "\r\n";

/**
 * Minimal JPEG magic bytes — enough for `upload.service.validateMagicBytes`
 * to recognise the file as JPEG. The payload is intentionally tiny so the
 * real `parseMultipartRequest` will fail dimension validation downstream
 * unless the test overrides the parser.
 */
export const JPEG_MAGIC_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

/**
 * Minimal PNG magic bytes.
 */
export const PNG_MAGIC_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Builds a `multipart/form-data` body and content-type header from a list of
 * parts. Each part is either:
 *
 *   - `{ name, filename, contentType, content }` for a file part, or
 *   - `{ name, value }` for a plain text field.
 *
 * @param {Array<
 *   { name: string, filename: string, contentType: string, content: Buffer|string }
 *   | { name: string, value: string }
 * >} parts
 * @param {string} [boundary] - Optional explicit boundary string.
 * @returns {{ payload: Buffer, headers: Record<string, string> }}
 */
export function buildMultipart(parts, boundary = "----astrosolveTestBoundary") {
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}${CRLF}`));
    if ("filename" in part) {
      chunks.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"${CRLF}` +
            `Content-Type: ${part.contentType}${CRLF}${CRLF}`,
        ),
      );
      chunks.push(
        Buffer.isBuffer(part.content)
          ? part.content
          : Buffer.from(part.content),
      );
      chunks.push(Buffer.from(CRLF));
    } else {
      chunks.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"${CRLF}${CRLF}` +
            `${part.value}${CRLF}`,
        ),
      );
    }
  }
  chunks.push(Buffer.from(`--${boundary}--${CRLF}`));

  return {
    payload: Buffer.concat(chunks),
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
  };
}

/**
 * Convenience wrapper that builds a single-file multipart payload mimicking a
 * browser upload of a JPEG named `image.jpg`.
 *
 * @param {object} [overrides]
 * @param {string} [overrides.name] - Field name (defaults to "image").
 * @param {string} [overrides.filename] - File name (defaults to "image.jpg").
 * @param {string} [overrides.contentType] - Content type (defaults to "image/jpeg").
 * @param {Buffer} [overrides.content] - File bytes (defaults to JPEG magic bytes).
 * @returns {{ payload: Buffer, headers: Record<string, string> }}
 */
export function buildSingleImageMultipart(overrides = {}) {
  return buildMultipart([
    {
      name: overrides.name ?? "image",
      filename: overrides.filename ?? "image.jpg",
      contentType: overrides.contentType ?? "image/jpeg",
      content: overrides.content ?? JPEG_MAGIC_BYTES,
    },
  ]);
}
