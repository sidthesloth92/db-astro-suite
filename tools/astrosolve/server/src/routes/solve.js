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
 * Parses the Fastify multipart request to stream the image to disk and extract hints.
 * 
 * @param {Object} request - The Fastify request object
 * @returns {Promise<{filePath: string|null, hints: Object}>}
 */
async function parseMultipartRequest(request) {
  const parts = request.parts();
  
  let filePath = null;
  let hints = {
    pixel_size: null,
    focal_length: null,
    ra_hint: null,
    dec_hint: null
  };

  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'image') {
      const ext = path.extname(part.filename) || '.jpg';
      const uniqueId = crypto.randomUUID();
      filePath = path.join(UPLOADS_DIR, `${uniqueId}${ext}`);
      
      // Stream directly to disk to prevent memory bloating
      await pipeline(part.file, createWriteStream(filePath));
    } else if (part.type === 'field') {
      if (hints[part.fieldname] !== undefined) {
        hints[part.fieldname] = part.value;
      }
    }
  }

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
    
    // 1. Parse payload directly to disk
    const { filePath, hints } = await parseMultipartRequest(request);

    // 2. Validate extracted data
    if (!filePath) {
      return reply.code(400).send({ error: "Missing 'image' file in multipart payload." });
    }

    if (!hints.pixel_size) {
      return reply.code(400).send({ 
        error: "Missing 'pixel_size' field. ASTAP requires an approximate pixel size to solve efficiently." 
      });
    }

    try {
      // 3. Ask queue to process the file and execute the solve
      const result = await solveQueue.add(() => processSolveRequest(filePath, hints));
      return reply.send(result);

    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: "Internal processing error during astrometry solving." });
    }
  });
}

