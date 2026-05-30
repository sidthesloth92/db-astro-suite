import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { AstrometryError } from "../models/errors.model.js";
import { tail } from "../utils/diagnostics.util.js";
import {
  FOV_PRESET,
  FOV_SCALE_RANGES,
  DOWNSAMPLE,
  SOLVE_DEPTH,
} from "../constants/solve-field.constants.js";

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

  const command = createAstrometryCommand(filePath, hints);
  try {
    log.info({ command }, "Executing astrometry solve-field");
    const { wcsData, stdout, stderr, durationMs, execError, wcsReadError } =
      await executeAstrometryAndGetWcsData(command, wcsFilePath, log);

    const solveStats = {
      duration_ms: durationMs,
      ...parseSolveFieldStdout(stdout),
    };
    const baseDiagnostics = {
      command,
      exit_code: execError?.code ?? null,
      signal: execError?.signal ?? null,
      killed: execError?.killed ?? false,
      stdout_tail: tail(stdout),
      stderr_tail: tail(stderr),
      elapsed_ms: durationMs,
    };

    if (!wcsData) {
      // solve-field produced no .wcs file — terminal failure.
      throw new AstrometryError(
        "Astrometry.net failed to plate-solve the image. The image might not contain enough stars or match the downloaded index files.",
        solveStats,
        {
          ...baseDiagnostics,
          wcs_file_existed: false,
          wcs_parse_error: null,
          wcs_read_error: wcsReadError?.message ?? null,
        },
      );
    }

    try {
      const alignmentInfo = parseAstrometryWcs(wcsData);
      // Prefer solve-field's reported field center + pixel scale (from stdout)
      // over the raw WCS keywords. CRVAL is the reference pixel — often NOT the
      // image center — so using it shifts the catalog search off-frame; and
      // CD1_1 alone is wrong under field rotation. solve-field computes both
      // correctly from the full WCS. Fall back to the WCS-derived values only
      // if stdout parsing failed.
      const ra = solveStats.field_center_ra ?? alignmentInfo.ra;
      const dec = solveStats.field_center_dec ?? alignmentInfo.dec;
      const scale =
        solveStats.pixel_scale_arcsec != null
          ? solveStats.pixel_scale_arcsec / 3600 // arcsec/px → deg/px (the unit the rest of the code expects)
          : alignmentInfo.scale;
      return {
        status: "success",
        wcsData,
        solveStats,
        // Surface the solved field dimensions to the top level so the caller
        // can size the catalog-search radius to the actual frame (half-diagonal)
        // instead of a fixed guess. These also live inside solveStats for
        // analytics; mirroring them here keeps the consumer from reaching into
        // the analytics-shaped blob.
        field_width_arcmin: solveStats.field_width_arcmin ?? null,
        field_height_arcmin: solveStats.field_height_arcmin ?? null,
        // Success-path diagnostics — mirrors the failure-path shape so
        // every solve_events row has comparable subsystem context. Lets
        // the dashboard ask "what command line / runtime / output produced
        // a successful solve?" without joining the request payload.
        diagnostics: {
          ...baseDiagnostics,
          status: "ok",
          wcs_file_existed: true,
        },
        ...alignmentInfo,
        // Authoritative center/scale override the WCS-keyword-derived ones.
        ra,
        dec,
        scale,
      };
    } catch (parseErr) {
      // .wcs exists but its contents are unparsable — separate signal
      // from "solve-field gave up" in the dashboard.
      throw new AstrometryError(
        parseErr.message,
        solveStats,
        {
          ...baseDiagnostics,
          wcs_file_existed: true,
          wcs_parse_error: parseErr.message,
          wcs_read_error: null,
        },
      );
    }
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
 * Resolves the blind-solve scale range for a requested FOV preset. Unknown
 * or missing presets fall back to AUTO (the full blind range) so a bad value
 * can never make a field unsolvable.
 *
 * @param {string | null | undefined} fovPreset
 * @returns {{ low: number, high: number }}
 */
function resolveScaleRange(fovPreset) {
  return FOV_SCALE_RANGES[fovPreset] ?? FOV_SCALE_RANGES[FOV_PRESET.AUTO];
}

/**
 * Picks the downsample factor from the image's largest dimension. Large
 * images tolerate an aggressive factor (fewer pixels → faster extraction);
 * small, near-minimum-resolution images keep the gentler factor so the solve
 * does not lose the stars it needs.
 *
 * @param {number | null | undefined} maxImageDimPx - Larger of width/height (px)
 * @returns {number}
 */
function resolveDownsampleFactor(maxImageDimPx) {
  const dim = Number(maxImageDimPx);
  if (Number.isFinite(dim) && dim >= DOWNSAMPLE.LARGE_IMAGE_MIN_DIM_PX) {
    return DOWNSAMPLE.LARGE_FACTOR;
  }
  return DOWNSAMPLE.SMALL_FACTOR;
}

/**
 * Constructs the solve-field command based on hints.
 *
 * @param {string} filePath - Absolute path to the uploaded image
 * @param {Object} hints - Solving hints { ra_hint, dec_hint, fov_preset, image_max_dim_px }
 * @returns {string} The constructed command string
 */
export function createAstrometryCommand(filePath, hints) {
  // -O (overwrite output)
  // -p (no plots/images, just math/data)
  // --new-fits 'none' (don't output a new fits file with wcs headers baked in)
  // -W (write WCS file out)
  // --objs 1000 (extract more stars)
  // --tweak-order 2 (better polynomial fit for distortion)
  // --downsample N (adaptive: aggressive for large images, gentle for small)
  // --depth a,b,c (solve in increasing star batches so easy fields finish early)
  const downsample = resolveDownsampleFactor(hints.image_max_dim_px);
  const baseCommand = `solve-field "${filePath}" -O -p --no-plots --objs 1000 --tweak-order 2 --downsample ${downsample} --depth ${SOLVE_DEPTH} --new-fits none --no-verify`;
  const wcsOut = `-W "${filePath.replace(path.extname(filePath), ".wcs")}"`;

  // Restrict the blind solve to the scale range implied by the FOV preset.
  // AUTO keeps the full downloaded-index range (index 19 reaches ~34 degrees);
  // narrower presets let solve-field skip indices that cannot match the frame.
  const { low, high } = resolveScaleRange(hints.fov_preset);
  const scaleParams = `--scale-units degwidth --scale-low ${low} --scale-high ${high}`;

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
 * Executes the solve-field command and attempts to read the resulting .wcs
 * file. Returns the raw materials needed to decide success vs. failure and
 * to build a diagnostics payload — never throws on solver-level problems
 * (those are signalled by `wcsData === null`). The caller (`solveWithAstrometry`)
 * is the only place that throws `AstrometryError`.
 *
 * @param {string} command - The shell command to execute
 * @param {string} wcsFilePath - Expected path of the output .wcs file
 * @param {Object} log - Fastify-compatible logger
 * @returns {Promise<{
 *   wcsData: string | null,
 *   stdout: string,
 *   stderr: string,
 *   durationMs: number,
 *   execError: (Error & { code?: number, signal?: string, killed?: boolean, stdout?: string, stderr?: string }) | null,
 *   wcsReadError: Error | null,
 * }>}
 */
async function executeAstrometryAndGetWcsData(command, wcsFilePath, log) {
  const startedAt = Date.now();
  let capturedStdout = "";
  let capturedStderr = "";
  let execError = null;
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 300_000 });
    capturedStdout = stdout || "";
    capturedStderr = stderr || "";
    if (stdout) log.info({ stdout }, "solve-field stdout");
    if (stderr) log.warn({ stderr }, "solve-field stderr");
  } catch (err) {
    execError = err;
    capturedStdout = err.stdout ?? "";
    capturedStderr = err.stderr ?? "";
    log.error(
      { err, stdout: err.stdout, stderr: err.stderr },
      "solve-field process failed; checking for .wcs output anyway",
    );
  }
  const durationMs = Date.now() - startedAt;

  let wcsData = null;
  let wcsReadError = null;
  try {
    wcsData = await fs.readFile(wcsFilePath, "utf8");
  } catch (readErr) {
    wcsReadError = readErr;
  }

  return {
    wcsData,
    stdout: capturedStdout,
    stderr: capturedStderr,
    durationMs,
    execError,
    wcsReadError,
  };
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
 * optional — missing matches return null for that field. Pre-solve metrics
 * like `sources_found` are present even when the solve eventually fails,
 * which is why this helper is also called from the failure path.
 *
 * @param {string} stdout
 * @returns {{
 *   sources_found: number | null,
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
      sources_found: null,
      field_width_arcmin: null,
      field_height_arcmin: null,
      field_rotation_deg: null,
      field_center_ra: null,
      field_center_dec: null,
      pixel_scale_arcsec: null,
      log_odds: null,
      match_count: null,
      index_used: null,
    };
  }
  // "simplexy: found 973 sources." — present on both success and failure.
  const sourcesMatch = stdout.match(/simplexy:\s*found\s+([0-9]+)\s+sources/);
  // "Field size: 46.0677 x 57.5913 arcminutes"
  const sizeMatch = stdout.match(
    /Field size:\s*([0-9.eE+-]+)\s*x\s*([0-9.eE+-]+)\s*arcminutes/,
  );
  // "Field rotation angle: up is 20.8236 degrees E of N"
  const rotMatch = stdout.match(
    /Field rotation angle:\s*up is\s*([0-9.eE+-]+)\s*degrees/,
  );
  // "Field center: (RA,Dec) = (14.903380, 60.946762) deg." — the TRUE image
  // center, computed by solve-field from the full WCS. This is authoritative;
  // the raw CRVAL keyword is the reference pixel, which is often not the
  // center and would shift the catalog search.
  const centerMatch = stdout.match(
    /Field center:\s*\(RA,\s*Dec\)\s*=\s*\(\s*([0-9.eE+-]+)\s*,\s*([0-9.eE+-]+)\s*\)/,
  );
  // "RA,Dec = (14.9047,60.9463), pixel scale 3.08398 arcsec/pix."
  const scaleMatch = stdout.match(
    /pixel scale\s+([0-9.eE+-]+)\s*arcsec\/pix/,
  );
  // "log-odds ratio 93.5234 (4.13723e+40), 11 match, 0 conflict, 9 distractors, 15 index."
  const oddsMatch = stdout.match(
    /log-odds ratio\s+([0-9.eE+-]+).*?,\s*([0-9]+)\s+match/,
  );
  // "Field 1: solved with index index-4109.fits."
  const indexMatch = stdout.match(/solved with index\s+(\S+?)\.fits/);

  return {
    sources_found: sourcesMatch ? parseInt(sourcesMatch[1], 10) : null,
    field_width_arcmin: sizeMatch ? parseFloat(sizeMatch[1]) : null,
    field_height_arcmin: sizeMatch ? parseFloat(sizeMatch[2]) : null,
    field_rotation_deg: rotMatch ? parseFloat(rotMatch[1]) : null,
    field_center_ra: centerMatch ? parseFloat(centerMatch[1]) : null,
    field_center_dec: centerMatch ? parseFloat(centerMatch[2]) : null,
    pixel_scale_arcsec: scaleMatch ? parseFloat(scaleMatch[1]) : null,
    log_odds: oddsMatch ? parseFloat(oddsMatch[1]) : null,
    match_count: oddsMatch ? parseInt(oddsMatch[2], 10) : null,
    index_used: indexMatch ? indexMatch[1] : null,
  };
}
