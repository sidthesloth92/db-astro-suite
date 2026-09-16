import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Renders the demo videos: each app, each half, each shape, with and without
 * the caption overlay.
 *
 * Remotion's CLI renders one composition per call, and there are two dozen, so
 * this drives them in one pass and names the files the way the hub and the
 * social posts expect. Filter with arguments to re-render a subset, e.g.
 * `node render.mjs astrogram vertical clean` or `node render.mjs spikes`.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const REMOTION = path.join(here, "remotion");
const OUT = path.join(here, "out");

const APPS = {
  astrogram: { id: "Astrogram", cuts: { full: "", card: "Card", map: "Map" } },
  astrospike: { id: "AstroSpike", cuts: { full: "", spikes: "Spikes", diffusion: "Diffusion" } },
};
const SHAPES = { desktop: "Desktop", vertical: "Vertical" };

const wanted = process.argv.slice(2).map((arg) => arg.toLowerCase());
const asked = (...names) => wanted.length === 0 || names.some((name) => wanted.includes(name));

const jobs = [];
for (const [app, { id, cuts }] of Object.entries(APPS)) {
  for (const [shape, shapeId] of Object.entries(SHAPES)) {
    for (const [cut, cutId] of Object.entries(cuts)) {
      for (const overlay of [true, false]) {
        if (!asked(app, shape, cut, overlay ? "overlay" : "clean")) {
          continue;
        }
        // Filters are ANDed only within a dimension, so a bare "clean" run
        // still covers every app, shape and cut.
        if (wanted.length > 0) {
          const dims = [
            [app],
            [shape],
            [cut],
            [overlay ? "overlay" : "clean"],
          ];
          const contradicts = dims.some(
            (names) =>
              wanted.some((w) => dimensionOf(w) === dimensionOf(names[0])) &&
              !names.some((name) => wanted.includes(name)),
          );
          if (contradicts) {
            continue;
          }
        }
        const suffix = `${cut === "full" ? "" : `-${cut}`}-${shape}${overlay ? "" : "-clean"}`;
        jobs.push({
          composition: `${id}${shapeId}${cutId}${overlay ? "" : "Clean"}`,
          file: path.join(OUT, `${app}-demo${suffix}.mp4`),
        });
      }
    }
  }
}

/** Which axis a filter word belongs to, so filters of one axis do not exclude another. */
function dimensionOf(word) {
  if (word in APPS) return "app";
  if (word in SHAPES) return "shape";
  if (word === "overlay" || word === "clean") return "overlay";
  return "cut";
}

if (jobs.length === 0) {
  process.stdout.write("nothing matched those filters\n");
  process.exit(1);
}

process.stdout.write(`rendering ${jobs.length} video${jobs.length === 1 ? "" : "s"}\n`);
for (const [index, job] of jobs.entries()) {
  process.stdout.write(`[${index + 1}/${jobs.length}] ${job.composition}\n`);
  execFileSync(
    "npx",
    ["remotion", "render", "src/index.ts", job.composition, job.file, "--timeout=120000"],
    { cwd: REMOTION, stdio: "inherit" },
  );
}
