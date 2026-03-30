import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { AstrometryError } from "../errors.js";

const execAsync = promisify(exec);

/**
 * Executes the local Astrometry.net CLI (solve-field) to plate solve an image, extracts coordinates
 * from the resulting .wcs file, and then aggressively cleans up all generated files.
 *
 * @param {string} filePath - Absolute path to the uploaded image in the uploads directory
 * @param {Object} hints - Solving hints { pixel_size, focal_length, ra_hint, dec_hint }
 * @param {Object} log - Fastify-compatible logger (request.log)
 * @returns {Promise<Object>} Solved WCS Metadata { ra, dec, scale, status }
 */
export async function solveWithAstrometry(filePath, hints, log) {
  const fileExt = path.extname(filePath);
  const baseName = path.basename(filePath, fileExt);
  const dirName = path.dirname(filePath);
  const wcsFilePath = path.join(dirName, `${baseName}.wcs`);

  try {
    const command = createAstrometryCommand(filePath, hints);
    log.info({ command }, "Executing astrometry solve-field");
    const wcsData = await executeAstrometryAndGetWcsData(
      command,
      wcsFilePath,
      log,
    );
    const alignmentInfo = parseAstrometryWcs(wcsData);

    return {
      status: "success",
      wcsData: wcsData,
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

  // Location hints — coerce to Number before interpolation to prevent shell injection
  let posParams = "";
  const raNum = Number(hints.ra_hint);
  const decNum = Number(hints.dec_hint);
  if (Number.isFinite(raNum) && Number.isFinite(decNum)) {
    posParams = `--ra ${raNum} --dec ${decNum} --radius 5`;
  }

  return `${baseCommand} ${wcsOut} ${scaleParams} ${posParams}`;
}

/**
 * Executes the solve-field command and reads the resulting .wcs file.
 *
 * @param {string} command - The shell command to execute
 * @param {string} wcsFilePath - Expected path of the output .wcs file
 * @param {Object} log - Fastify-compatible logger
 * @returns {Promise<string>} Raw WCS file contents
 */
async function executeAstrometryAndGetWcsData(command, wcsFilePath, log) {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 120_000 });
    if (stdout) log.info({ stdout }, "solve-field stdout");
    if (stderr) log.warn({ stderr }, "solve-field stderr");
  } catch (execError) {
    log.error(
      { err: execError, stdout: execError.stdout, stderr: execError.stderr },
      "solve-field process failed; checking for .wcs output anyway",
    );
  }

  // The true test of success is whether the .wcs file was generated.
  try {
    return await fs.readFile(wcsFilePath, "utf8");
  } catch (readErr) {
    throw new AstrometryError(
      "Astrometry.net failed to plate-solve the image. The image might not contain enough stars or match the downloaded index files.",
    );
  }
}

/**
 * Parses Astrometry.net WCS data string to extract RA, DEC, and scaling.
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
