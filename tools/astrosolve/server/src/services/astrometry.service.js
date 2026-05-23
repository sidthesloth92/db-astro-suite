import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { AstrometryError } from "../models/errors.model.js";

const execAsync = promisify(exec);

/**
 * Executes the local Astrometry.net CLI (solve-field) to plate solve an image, extracts coordinates
 * from the resulting .wcs file, and then aggressively cleans up all generated files.
 *
 * @param {string} filePath - Absolute path to the uploaded image in the uploads directory
 * @param {Object} hints - Solving hints { pixel_size, focal_length, ra_hint, dec_hint }
 * @param {Object} log - Fastify-compatible logger (request.log)
 * @returns {Promise<Object>} Solved WCS Metadata { ra, dec, scale, status, wcsData, solveStats }
 */
export async function solveWithAstrometry(filePath, hints, log) {
  const fileExt = path.extname(filePath);
  const baseName = path.basename(filePath, fileExt);
  const dirName = path.dirname(filePath);
  const wcsFilePath = path.join(dirName, `${baseName}.wcs`);

  try {
    const command = createAstrometryCommand(filePath, hints);
    log.info({ command }, "Executing astrometry solve-field");
    const { wcsData, stdout, durationMs } =
      await executeAstrometryAndGetWcsData(command, wcsFilePath, log);
    const alignmentInfo = parseAstrometryWcs(wcsData);
    const solveStats = {
      duration_ms: durationMs,
      ...parseSolveFieldStdout(stdout),
    };

    return {
      status: "success",
      wcsData: wcsData,
      solveStats,
      ...alignmentInfo,
    };
  } finally {
    // Astrometry.net creates many intermediate files (*.axy, *.corr, *.match, etc).
    // The easiest cleanup is simply matching the basename in the folder.
    try {
      const files = await fs.readdir(dirName);
      for (const file of files) {
        if (file.startsWith(baseName)) {
          await fs.unlink(path.join(dirName, file)).catch(() => {});
        }
      }
    } catch (cleanupErr) {
      log.error(
        { err: cleanupErr },
        "Cleanup of astrometry intermediate files failed",
      );
    }
  }
}

/**
 * Constructs the solve-field command based on hints.
 *
 * @param {string} filePath - Absolute path to the uploaded image
 * @param {Object} hints - Solving hints
 * @returns {string} The constructed command string
 */
function createAstrometryCommand(filePath, hints) {
  // -O (overwrite output)
  // -p (no plots/images, just math/data)
  // --new-fits 'none' (don't output a new fits file with wcs headers baked in)
  // -W (write WCS file out)
  // --objs 1000 (extract more stars)
  // --tweak-order 2 (better polynomial fit for distortion)
  // --downsample 2 (standard for modern high-res digital cameras)
  const baseCommand = `solve-field "${filePath}" -O -p --no-plots --objs 1000 --tweak-order 2 --downsample 2 --new-fits none --no-verify`;
  const wcsOut = `-W "${filePath.replace(path.extname(filePath), ".wcs")}"`;

  // Blind solve mode restricted to downloaded indices (index 19 reaches ~34 degrees)
  const scaleParams = `--scale-units degwidth --scale-low 0.1 --scale-high 34.0`;

  // Location hints — only applied when both ra_hint and dec_hint are explicitly
  // provided. Guard against null/undefined before coercing to Number, because
  // Number(null) === 0 and Number.isFinite(0) === true would otherwise pin
  // solve-field to a 5° radius around RA=0, Dec=0 for every blind solve.
  let posParams = "";
  if (hints.ra_hint != null && hints.dec_hint != null) {
    const raNum = Number(hints.ra_hint);
    const decNum = Number(hints.dec_hint);
    if (Number.isFinite(raNum) && Number.isFinite(decNum)) {
      posParams = `--ra ${raNum} --dec ${decNum} --radius 5`;
    }
  }

  return `${baseCommand} ${wcsOut} ${scaleParams} ${posParams}`;
}

/**
 * Executes the solve-field command and reads the resulting .wcs file.
 *
 * @param {string} command - The shell command to execute
 * @param {string} wcsFilePath - Expected path of the output .wcs file
 * @param {Object} log - Fastify-compatible logger
 * @returns {Promise<{ wcsData: string, stdout: string, durationMs: number }>}
 */
async function executeAstrometryAndGetWcsData(command, wcsFilePath, log) {
  const startedAt = Date.now();
  let capturedStdout = "";
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 300_000 });
    capturedStdout = stdout || "";
    if (stdout) log.info({ stdout }, "solve-field stdout");
    if (stderr) log.warn({ stderr }, "solve-field stderr");
  } catch (execError) {
    capturedStdout = execError.stdout ?? "";
    log.error(
      { err: execError, stdout: execError.stdout, stderr: execError.stderr },
      "solve-field process failed; checking for .wcs output anyway",
    );
  }
  const durationMs = Date.now() - startedAt;

  // The true test of success is whether the .wcs file was generated.
  try {
    const wcsData = await fs.readFile(wcsFilePath, "utf8");
    return { wcsData, stdout: capturedStdout, durationMs };
  } catch (readErr) {
    throw new AstrometryError(
      "Astrometry.net failed to plate-solve the image. The image might not contain enough stars or match the downloaded index files.",
    );
  }
}

/**
 * Parses Astrometry.net WCS data string to extract RA, DEC, and scaling.
 *
 * @param {string} wcsData - Raw WCS file contents from Astrometry.net
 * @returns {{ ra: number, dec: number, scale: number | null }} Parsed coordinate and scale data
 */
function parseAstrometryWcs(wcsData) {
  // Parse WCS for RA (CRVAL1) and DEC (CRVAL2)
  const raMatch = wcsData.match(/CRVAL1\s*=\s*([0-9.-]+)/);
  const decMatch = wcsData.match(/CRVAL2\s*=\s*([0-9.-]+)/);
  const scaleMatch = wcsData.match(/CD1_1\s*=\s*([0-9.-]+)/); // Astrometry uses CD matrix

  let ra = null;
  let dec = null;
  let scale = null;

  if (raMatch && raMatch[1]) ra = parseFloat(raMatch[1]);
  if (decMatch && decMatch[1]) dec = parseFloat(decMatch[1]);
  if (scaleMatch && scaleMatch[1]) {
    // CD1_1 is in degrees. Convert to absolute scale.
    scale = Math.abs(parseFloat(scaleMatch[1]));
  }

  if (ra === null || dec === null) {
    throw new AstrometryError(
      "WCS file generated but could not parse CRVAL1/CRVAL2 for coordinates.",
    );
  }

  return { ra, dec, scale };
}

/**
 * Extracts auxiliary solve metrics from solve-field's stdout. All fields are
 * optional — missing matches return null for that field.
 *
 * @param {string} stdout
 * @returns {{
 *   field_width_arcmin: number | null,
 *   field_height_arcmin: number | null,
 *   field_rotation_deg: number | null,
 *   log_odds: number | null,
 *   match_count: number | null,
 *   index_used: string | null,
 * }}
 */
export function parseSolveFieldStdout(stdout) {
  if (!stdout) {
    return {
      field_width_arcmin: null,
      field_height_arcmin: null,
      field_rotation_deg: null,
      log_odds: null,
      match_count: null,
      index_used: null,
    };
  }
  // "Field size: 46.0677 x 57.5913 arcminutes"
  const sizeMatch = stdout.match(
    /Field size:\s*([0-9.eE+-]+)\s*x\s*([0-9.eE+-]+)\s*arcminutes/,
  );
  // "Field rotation angle: up is 20.8236 degrees E of N"
  const rotMatch = stdout.match(
    /Field rotation angle:\s*up is\s*([0-9.eE+-]+)\s*degrees/,
  );
  // "log-odds ratio 93.5234 (4.13723e+40), 11 match, 0 conflict, 9 distractors, 15 index."
  const oddsMatch = stdout.match(
    /log-odds ratio\s+([0-9.eE+-]+).*?,\s*([0-9]+)\s+match/,
  );
  // "Field 1: solved with index index-4109.fits."
  const indexMatch = stdout.match(/solved with index\s+(\S+?)\.fits/);

  return {
    field_width_arcmin: sizeMatch ? parseFloat(sizeMatch[1]) : null,
    field_height_arcmin: sizeMatch ? parseFloat(sizeMatch[2]) : null,
    field_rotation_deg: rotMatch ? parseFloat(rotMatch[1]) : null,
    log_odds: oddsMatch ? parseFloat(oddsMatch[1]) : null,
    match_count: oddsMatch ? parseInt(oddsMatch[2], 10) : null,
    index_used: indexMatch ? indexMatch[1] : null,
  };
}
