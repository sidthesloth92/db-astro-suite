import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Executes the ASTAP CLI to plate solve an image, extracts coordinates from the resulting .wcs file,
 * and then aggressively cleans up both the input image and the generated result file.
 * 
 * @param {string} filePath - Absolute path to the uploaded image in the uploads directory
 * @param {Object} hints - Solving hints { pixel_size, focal_length, ra_hint, dec_hint }
 * @returns {Promise<Object>} Solved WCS Metadata { ra, dec, scale, status }
 */
export async function solveWithASTAP(filePath, hints) {
  const fileExt = path.extname(filePath);
  const baseName = path.basename(filePath, fileExt);
  const dirName = path.dirname(filePath);
  const wcsFilePath = path.join(dirName, `${baseName}.wcs`);

  try {
    const command = createAstapCommand(filePath, hints);
    const wcsData = await executeAstapAndGetWcsData(command, wcsFilePath);
    const alignmentInfo = generateStarAlignmentInfo(wcsData);

    return {
      status: "success",
      ...alignmentInfo
    };

  } finally {
    // Phase C Mandatory Cleanup: Delete both files immediately
    try {
      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(wcsFilePath).catch(() => {});
    } catch (cleanupErr) {
      console.error("Cleanup failed:", cleanupErr);
    }
  }
}

/**
 * Constructs the ASTAP CLI command based on hints.
 * 
 * @param {string} filePath - Absolute path to the uploaded image in the uploads directory
 * @param {Object} hints - Solving hints { pixel_size, focal_length, ra_hint, dec_hint }
 * @returns {string} The constructed command string
 */
function createAstapCommand(filePath, hints) {
  // Construct the ASTAP command
  // -z 0 (no downsampling natively or configure if needed), -r 30 (search radius 30 deg)
  let command = `astap -f "${filePath}" -z 0 -r 30 -pixelsize ${hints.pixel_size}`;

  if (hints.focal_length) {
    command += ` -focal ${hints.focal_length}`;
  }
  if (hints.ra_hint) {
    command += ` -ra ${hints.ra_hint}`;
  }
  if (hints.dec_hint) {
    command += ` -dec ${hints.dec_hint}`;
  }
  
  return command;
}

/**
 * Executes the ASTAP command and attempts to read the resulting .wcs file.
 * 
 * @param {string} command - The ASTAP command to execute
 * @param {string} wcsFilePath - Expected path to the generated .wcs file
 * @returns {Promise<string>} The contents of the .wcs file
 */
async function executeAstapAndGetWcsData(command, wcsFilePath) {
  try {
    // Execute ASTAP. It returns exit code 0 on success. 
    // Note: If no solve, it might return a different code or just not generate a .wcs file.
    await execAsync(command);
  } catch (execError) {
    // ASTAP might throw an error code if it fails to solve
    console.warn(`ASTAP execution threw: ${execError.message}, continuing to check for .wcs fallback.`);
  }

  // Attempt to read the resulting .wcs file
  try {
    return await fs.readFile(wcsFilePath, 'utf8');
  } catch (readErr) {
    throw new Error("ASTAP failed to solve the image (no .wcs file generated).");
  }
}

/**
 * Parses WCS data string to extract RA, DEC, and scaling.
 * 
 * @param {string} wcsData - The raw content of the .wcs file
 * @returns {Object} Extracted alignment info { ra, dec, scale }
 */
function generateStarAlignmentInfo(wcsData) {
  // Parse WCS for RA (CRVAL1) and DEC (CRVAL2)
  const raMatch = wcsData.match(/CRVAL1\s*=\s*([0-9.-]+)/);
  const decMatch = wcsData.match(/CRVAL2\s*=\s*([0-9.-]+)/);
  const scaleMatch = wcsData.match(/CDELT1\s*=\s*([0-9.-]+)/); // Optional scale in degrees/pixel

  let ra = null;
  let dec = null;
  let scale = null;

  if (raMatch && raMatch[1]) ra = parseFloat(raMatch[1]);
  if (decMatch && decMatch[1]) dec = parseFloat(decMatch[1]);
  if (scaleMatch && scaleMatch[1]) scale = Math.abs(parseFloat(scaleMatch[1]));

  if (ra === null || dec === null) {
    throw new Error("WCS file generated but could not parse CRVAL1/CRVAL2 for coordinates.");
  }

  return { ra, dec, scale };
}

/**
 * Executes the ASTAP CLI to plate solve an image, extracts coordinates from the resulting .wcs file,
 * and then aggressively cleans up both the input image and the generated result file.
 * 
 * @param {string} filePath - Absolute path to the uploaded image in the uploads directory
 * @param {Object} hints - Solving hints { pixel_size, focal_length, ra_hint, dec_hint }
 * @returns {Promise<Object>} Solved WCS Metadata { ra, dec, scale, status }
 */
export async function solveWithASTAP(filePath, hints) {
  const fileExt = path.extname(filePath);
  const baseName = path.basename(filePath, fileExt);
  const dirName = path.dirname(filePath);
  const wcsFilePath = path.join(dirName, `${baseName}.wcs`);

  try {
    const command = createAstapCommand(filePath, hints);
    const wcsData = await executeAstapAndGetWcsData(command, wcsFilePath);
    const alignmentInfo = generateStarAlignmentInfo(wcsData);

    return {
      status: "success",
      ...alignmentInfo
    };

  } finally {
    // Phase C Mandatory Cleanup: Delete both files immediately
    try {
      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(wcsFilePath).catch(() => {});
    } catch (cleanupErr) {
      console.error("Cleanup failed:", cleanupErr);
    }
  }
}
