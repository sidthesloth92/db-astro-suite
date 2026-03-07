import PQueue from 'p-queue';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { solveWithASTAP } from '../services/astap.js';
import { querySimbad } from '../services/simbad.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Concurrency queue to protect backend execution (max 2 parallel ASTAP solves)
const solveQueue = new PQueue({ concurrency: 2 });

/**
 * Validates the hints before allowing the image stream to proceed.
 * @param {Object} fields - Extracted multipart fields
 * @returns {Object} Clean hints object
 */
function validateAndExtractHints(fields) {
  if (!fields.pixel_size || !fields.pixel_size.value) {
    throw new Error("Missing 'pixel_size' field. ASTAP requires an approximate pixel size to solve efficiently.");
  }

  return {
    pixel_size: fields.pixel_size.value,
    focal_length: fields.focal_length ? fields.focal_length.value : null,
    ra_hint: fields.ra_hint ? fields.ra_hint.value : null,
    dec_hint: fields.dec_hint ? fields.dec_hint.value : null
  };
}

/**
 * Validates that an image file was provided in the multipart request and has an allowed extension.
 * @param {Object} data - The Fastify multipart file object
 */
function validateImageReceived(data) {
  if (!data || !data.file) {
    throw new Error("Missing 'image' file in multipart payload.");
  }

  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(data.filename).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Invalid file extension: ${ext}. Only .jpg, .jpeg, and .png are allowed.`);
  }
}

/**
 * Parses the Fastify multipart request, validating hints first before streaming the image to disk.
 * 
 * @param {Object} request - The Fastify request object
 * @returns {Promise<{filePath: string|null, hints: Object}>}
 */
async function parseMultipartRequest(request) {
  // `request.file()` reads the multipart stream up until the first file it finds.
  // It automatically populates `data.fields` with any fields that arrived BEFORE the file.
  // This inherently forces the client to send fields first if we validate them here.
  const data = await request.file();

  // 1. Validate File Presence
  validateImageReceived(data);

  // 2. Validate Fields
  const hints = validateAndExtractHints(data.fields);

  // 3. File exists and hints are valid, proceed to save to disk
  const ext = path.extname(data.filename) || '.jpg';
  const uniqueId = crypto.randomUUID();
  const filePath = path.join(UPLOADS_DIR, `${uniqueId}${ext}`);
  
  await pipeline(data.file, createWriteStream(filePath));

  return { filePath, hints };
}

/**
 * Executes the ASTAP WCS solve and queries SIMBAD for matching objects sequentially.
 * 
 * @param {string} filePath - Absolute path to the saved image file
 * @param {Object} hints - Solving hints extracted from the request
 * @returns {Promise<Object>} The combined ASTAP and SIMBAD payload
 */
async function processSolveRequest(filePath, hints) {
  // Step 1: Plate Solve using ASTAP (auto-cleans files)
  const solveResult = await solveWithASTAP(filePath, hints);
  
  // Step 2: Query SIMBAD for objects within field of view
  // Using a conservative radius based on typical deep sky fields (~2 degrees). 
  // This could be calculated from pixel_size and dimensions in the future.
  const radius = 2.0; 
  const objects = await querySimbad(solveResult.ra, solveResult.dec, radius);

  return {
    status: "success",
    metadata: {
      ra: solveResult.ra,
      dec: solveResult.dec,
      scale: solveResult.scale,
      radius_searched: radius
    },
    objects: objects
  };
}

export default async function (fastify) {
  
  // Ensure uploads directory exists
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  fastify.post('/api/v1/solve', async (request, reply) => {
    
    try {
      // 1. Parse payload directly to disk (this now fails early if required params are missing)
      const { filePath, hints } = await parseMultipartRequest(request);

      // 2. Ask queue to process the file and execute the solve
      const result = await solveQueue.add(() => processSolveRequest(filePath, hints));
      return reply.send(result);

    } catch (e) {
      // Catch our custom validation errors from the parsing loop
      if (e.message.startsWith('Missing')) {
        return reply.code(400).send({ error: e.message });
      }

      fastify.log.error(e);
      return reply.code(500).send({ error: "Internal processing error during astrometry solving." });
    }
  });
}

