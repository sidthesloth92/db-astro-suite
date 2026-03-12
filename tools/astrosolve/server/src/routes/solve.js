import PQueue from "p-queue";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { solveWithAstrometry } from "../services/astrometry.js";
import { querySimbad } from "../services/simbad.js";
import { queryLocalCatalog } from "../services/local-catalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Concurrency queue to protect backend execution (max 2 parallel ASTAP solves)
const solveQueue = new PQueue({ concurrency: 2 });

/**
 * Validates the hints before allowing the image stream to proceed.
 * @param {Object} fields - Extracted multipart fields
 * @returns {Object} Clean hints object
 */
function validateAndExtractHints(fields) {
  // Parsing types from comma separated string if provided
  const typesField = fields.types ? fields.types.value : null;
  const types = typesField ? typesField.split(",").map((t) => t.trim()) : [];

  return {
    min_magnitude: 20, // Search up to mag 20 for widest coverage
    types: types,
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

  const allowedExtensions = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(data.filename).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error(
      `Invalid file extension: ${ext}. Only .jpg, .jpeg, and .png are allowed.`,
    );
  }
}

import { imageSize } from "image-size";

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
  const ext = path.extname(data.filename) || ".jpg";
  const uniqueId = crypto.randomUUID();
  const filePath = path.join(UPLOADS_DIR, `${uniqueId}${ext}`);

  await pipeline(data.file, createWriteStream(filePath));

  // 4. Validate Dimensions (After saving)
  try {
    const stats = await fs.stat(filePath);
    request.log.info(
      `Saved upload to ${filePath}. File size on disk: ${stats.size} bytes.`,
    );

    if (stats.size === 0) {
      throw new Error("Uploaded file is 0 bytes. Stream was empty.");
    }

    const fileBuffer = await fs.readFile(filePath);
    const dimensions = imageSize(new Uint8Array(fileBuffer));
    if (!dimensions || dimensions.width < 100 || dimensions.height < 100) {
      // Immediately delete the undersized file
      await fs.unlink(filePath).catch(() => {});
      throw new Error(
        `Image resolution is too low (${dimensions?.width}x${dimensions?.height}).`,
      );
    }
  } catch (err) {
    if (
      err.message.includes("resolution is too low") ||
      err.message.includes("0 bytes")
    ) {
      throw err; // Re-throw our custom validation error
    }
    // If image-size fails to read entirely (e.g. corrupt header), fail cleanly
    await fs.unlink(filePath).catch(() => {});
    request.log.error(err, "Failed to parse image dimensions");
    throw new Error(
      "Uploaded image file appears to be corrupted or in an unsupported format.",
    );
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
  // Step 1: Plate Solve using local Astrometry.net
  const solveResult = await solveWithAstrometry(filePath, hints);

  // Step 2: Hybrid Search (Local + SIMBAD)
  // We search within a 2-degree radius (typical wide field crop)
  const radius = 2.0;

  // Fire both queries in parallel
  const [localObjects, simbadObjects] = await Promise.all([
    // Local DB Query (Extremely fast, <10ms)
    Promise.resolve(
      queryLocalCatalog({
        ra: solveResult.ra,
        dec: solveResult.dec,
        radiusDeg: radius,
        maxMagnitude: hints.min_magnitude,
        types: hints.types,
      }),
    ).catch(() => []),

    // SIMBAD Query (Slower, network dependent)
    querySimbad(
      solveResult.ra,
      solveResult.dec,
      radius,
      hints.min_magnitude,
    ).catch((err) => {
      console.error(
        "SIMBAD query failed (falling back to local only):",
        err.message,
      );
      return [];
    }),
  ]);

  // Step 3: Deduplication & Merging
  // Stars tier priority: SIMBAD (Gaia DR3) > HIP local (Hipparcos ~1 mas) > HD local (1920s ~10 arcsec)
  // DSOs priority: local (better common names/metadata) > SIMBAD fills gaps
  const STAR_TYPES = new Set([
    "*",
    "**",
    "V*",
    "Ce*",
    "RR*",
    "LP*",
    "Mi*",
    "WR*",
    "C*",
    "Be*",
    "HB*",
    "WD*",
    "No*",
    "SN*",
    "Star", // local catalog type used for HD, HIP, and named star entries
  ]);

  // Catalog accuracy priority for local star sources (higher = more accurate)
  const CATALOG_PRIORITY = { HIP: 3, TYC: 2 };

  // Build best-per-name map from local stars (HIP beats HD when both present)
  const localStarsByName = new Map();
  for (const obj of localObjects.filter((o) => STAR_TYPES.has(o.type))) {
    const key = obj.name.toLowerCase();
    const cur = localStarsByName.get(key);
    const pri = CATALOG_PRIORITY[obj.catalog] || 0;
    if (!cur || pri > (CATALOG_PRIORITY[cur.catalog] || 0)) {
      localStarsByName.set(key, obj);
    }
  }

  // SIMBAD stars: update local entry position when names match (fast path), or
  // do a 30" spatial match to handle cases where SIMBAD MAIN_ID ≠ local HD name
  // (e.g. local has "HD 150679", SIMBAD returns the same star as "HIP 81693").
  // This prevents duplicate annotations for the same physical star.
  const localStarSnapshot = [...localStarsByName.values()]; // snapshot before updates
  const MATCH_DEG = 30 / 3600; // 30 arcseconds in degrees

  for (const obj of simbadObjects.filter((o) => STAR_TYPES.has(o.type))) {
    const nameKey = obj.name.toLowerCase();

    // Fast path: SIMBAD name exactly matches a local star → position-correct it
    if (localStarsByName.has(nameKey)) {
      localStarsByName.set(nameKey, obj);
      continue;
    }

    // Spatial path: same physical star under a different identifier
    const cosDec = Math.cos(((obj.dec ?? 0) * Math.PI) / 180);
    const nearby = localStarSnapshot.find((s) => {
      const dRa = (obj.ra - s.ra) * cosDec;
      const dDec = obj.dec - s.dec;
      return dRa * dRa + dDec * dDec < MATCH_DEG * MATCH_DEG;
    });

    if (nearby) {
      // Position-correct the local entry (keeps HD name & catalog metadata)
      localStarsByName.set(nearby.name.toLowerCase(), {
        ...nearby,
        ra: obj.ra,
        dec: obj.dec,
      });
    } else {
      // Genuinely new object not in local catalog
      localStarsByName.set(nameKey, obj);
    }
  }

  // DSOs: local always wins; SIMBAD adds only what local doesn't have
  const localDSOs = localObjects.filter((o) => !STAR_TYPES.has(o.type));
  const localDSONames = new Set(localDSOs.map((o) => o.name.toLowerCase()));
  const simbadDSOs = simbadObjects.filter(
    (o) => !STAR_TYPES.has(o.type) && !localDSONames.has(o.name.toLowerCase()),
  );

  const merged = [...localDSOs, ...localStarsByName.values(), ...simbadDSOs];

  return {
    status: "success",
    metadata: {
      ra: solveResult.ra,
      dec: solveResult.dec,
      scale: solveResult.scale,
      wcs: solveResult.wcsData,
      radius_searched: radius,
    },
    objects: merged,
  };
}

export default async function (fastify) {
  // Ensure uploads directory exists
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  fastify.post("/api/v1/solve", async (request, reply) => {
    try {
      // 1. Parse payload directly to disk (this now fails early if required params are missing)
      fastify.log.info("Parsing multipart request...");
      const { filePath, hints } = await parseMultipartRequest(request);
      fastify.log.info(`Multipart parsed, starting queue for ${filePath}`);

      // 2. Ask queue to process the file and execute the solve
      const result = await solveQueue.add(async () => {
        fastify.log.info("Queue executing processSolveRequest...");
        const res = await processSolveRequest(filePath, hints);
        fastify.log.info("processSolveRequest completed.");
        return res;
      });
      fastify.log.info("Sending reply...");
      return reply.send(result);
    } catch (e) {
      // Catch our custom validation errors from the parsing loop
      if (
        e.message.startsWith("Missing") ||
        e.message.includes("resolution is too low") ||
        e.message.includes("Invalid file extension") ||
        e.message.includes("corrupted")
      ) {
        return reply.code(400).send({ error: e.message });
      }

      fastify.log.error(e);
      return reply
        .code(500)
        .send({
          error: "Internal processing error during astrometry solving.",
        });
    }
  });
}
