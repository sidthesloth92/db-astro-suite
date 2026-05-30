import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAstrometryCommand,
  parseSolveFieldStdout,
} from "./astrometry.service.js";
import {
  FOV_SCALE_RANGES,
  FOV_PRESET,
  DOWNSAMPLE,
  SOLVE_DEPTH,
} from "../constants/solve-field.constants.js";

const FILE = "/tmp/uploads/abc.jpg";

describe("createAstrometryCommand — FOV scale range", () => {
  it("uses the full AUTO blind range when no preset is supplied", () => {
    const cmd = createAstrometryCommand(FILE, {});
    const { low, high } = FOV_SCALE_RANGES[FOV_PRESET.AUTO];
    assert.match(cmd, new RegExp(`--scale-low ${low} --scale-high ${high}`));
  });

  it("narrows the scale range for the WIDE preset", () => {
    const cmd = createAstrometryCommand(FILE, { fov_preset: "wide" });
    const { low, high } = FOV_SCALE_RANGES[FOV_PRESET.WIDE];
    assert.match(cmd, new RegExp(`--scale-low ${low} --scale-high ${high}`));
  });

  it("narrows the scale range for the MEDIUM preset", () => {
    const cmd = createAstrometryCommand(FILE, { fov_preset: "medium" });
    const { low, high } = FOV_SCALE_RANGES[FOV_PRESET.MEDIUM];
    assert.match(cmd, new RegExp(`--scale-low ${low} --scale-high ${high}`));
  });

  it("narrows the scale range for the NARROW preset", () => {
    const cmd = createAstrometryCommand(FILE, { fov_preset: "narrow" });
    const { low, high } = FOV_SCALE_RANGES[FOV_PRESET.NARROW];
    assert.match(cmd, new RegExp(`--scale-low ${low} --scale-high ${high}`));
  });

  it("falls back to AUTO for an unrecognised preset", () => {
    const cmd = createAstrometryCommand(FILE, { fov_preset: "bogus" });
    const { low, high } = FOV_SCALE_RANGES[FOV_PRESET.AUTO];
    assert.match(cmd, new RegExp(`--scale-low ${low} --scale-high ${high}`));
  });
});

describe("createAstrometryCommand — adaptive downsample", () => {
  it("uses the aggressive factor for a large image", () => {
    const cmd = createAstrometryCommand(FILE, {
      image_max_dim_px: DOWNSAMPLE.LARGE_IMAGE_MIN_DIM_PX,
    });
    assert.match(cmd, new RegExp(`--downsample ${DOWNSAMPLE.LARGE_FACTOR}\\b`));
  });

  it("uses the gentle factor for a small image", () => {
    const cmd = createAstrometryCommand(FILE, {
      image_max_dim_px: DOWNSAMPLE.LARGE_IMAGE_MIN_DIM_PX - 1,
    });
    assert.match(cmd, new RegExp(`--downsample ${DOWNSAMPLE.SMALL_FACTOR}\\b`));
  });

  it("defaults to the gentle factor when the dimension is unknown", () => {
    const cmd = createAstrometryCommand(FILE, {});
    assert.match(cmd, new RegExp(`--downsample ${DOWNSAMPLE.SMALL_FACTOR}\\b`));
  });
});

describe("createAstrometryCommand — depth and position hints", () => {
  it("includes the configured solve depth schedule", () => {
    const cmd = createAstrometryCommand(FILE, {});
    assert.match(cmd, new RegExp(`--depth ${SOLVE_DEPTH}\\b`));
  });

  it("applies position hints when both ra and dec are finite", () => {
    const cmd = createAstrometryCommand(FILE, { ra_hint: 83.8, dec_hint: -5.4 });
    assert.match(cmd, /--ra 83\.8 --dec -5\.4 --radius 5/);
  });

  it("omits position hints when ra/dec are absent", () => {
    const cmd = createAstrometryCommand(FILE, {});
    assert.doesNotMatch(cmd, /--ra /);
  });
});

describe("parseSolveFieldStdout", () => {
  it("extracts field size, sources, rotation, match count and index", () => {
    const stdout = [
      "simplexy: found 973 sources.",
      "Field size: 46.0677 x 57.5913 arcminutes",
      "Field rotation angle: up is 20.8236 degrees E of N",
      "log-odds ratio 93.5234 (4.13723e+40), 11 match, 0 conflict, 9 distractors, 15 index.",
      "Field 1: solved with index index-4109.fits.",
    ].join("\n");
    const r = parseSolveFieldStdout(stdout);
    assert.equal(r.sources_found, 973);
    assert.equal(r.field_width_arcmin, 46.0677);
    assert.equal(r.field_height_arcmin, 57.5913);
    assert.equal(r.match_count, 11);
    assert.equal(r.index_used, "index-4109");
  });

  it("extracts the true field center and pixel scale (not the CRVAL reference pixel)", () => {
    // Real IC63 solve output: 'Field center' is the authoritative image center,
    // distinct from the WCS CRVAL reference pixel.
    const stdout = [
      "  RA,Dec = (14.9047,60.9463), pixel scale 3.08398 arcsec/pix.",
      "Field center: (RA,Dec) = (14.903380, 60.946762) deg.",
      "Field size: 55.5315 x 74.039 arcminutes",
    ].join("\n");
    const r = parseSolveFieldStdout(stdout);
    assert.equal(r.field_center_ra, 14.90338);
    assert.equal(r.field_center_dec, 60.946762);
    assert.equal(r.pixel_scale_arcsec, 3.08398);
  });

  it("returns all-null for empty stdout", () => {
    const r = parseSolveFieldStdout("");
    assert.equal(r.field_width_arcmin, null);
    assert.equal(r.sources_found, null);
    assert.equal(r.field_center_ra, null);
    assert.equal(r.field_center_dec, null);
    assert.equal(r.pixel_scale_arcsec, null);
  });
});
