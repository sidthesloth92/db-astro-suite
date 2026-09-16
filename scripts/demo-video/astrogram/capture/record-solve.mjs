import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Records one real plate solve of the Rosette sample, for the capture to replay.
 *
 * A live solve takes anything from seconds to minutes and needs an access key,
 * so re-capturing the video against the real API would make every take wait on
 * the solver and differ in timing. Instead this runs the solve once and saves
 * the response; the capture serves it back through `page.route`, so the app
 * goes through its real request, loader and annotation code with a result that
 * is identical every time.
 *
 * The key is read from the environment and only ever sent as a header — it is
 * never written anywhere. Run it yourself so the key stays out of any log:
 *
 *   ASTROSOLVE_ACCESS_KEY=… node scripts/astrogram-demo-video/capture/record-solve.mjs
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../../../..");
const IMAGE = path.join(REPO, "tools/astrogram/public/assets/img/rosette.jpg");
const OUT = path.resolve(here, "../fixtures/rosette-solve.json");
const API = process.env.ASTROSOLVE_API ?? "https://api.dbastrosuite.com";
const FOV_PRESET = process.env.DEMO_FOV_PRESET ?? "medium";

const key = process.env.ASTROSOLVE_ACCESS_KEY;
if (!key) {
  process.stderr.write("Set ASTROSOLVE_ACCESS_KEY to your Astrosolve access key.\n");
  process.exit(1);
}

const form = new FormData();
form.append("fov_preset", FOV_PRESET);
form.append("image", new Blob([readFileSync(IMAGE)], { type: "image/jpeg" }), "rosette.jpg");

process.stdout.write(`Solving rosette.jpg (${FOV_PRESET}) against ${API} …\n`);
const started = Date.now();
const response = await fetch(`${API}/api/v1/solve`, {
  method: "POST",
  headers: { "x-access-key": key },
  body: form,
  signal: AbortSignal.timeout(6 * 60 * 1000),
});
const body = await response.json();

if (!response.ok) {
  process.stderr.write(`Solve failed (${response.status}): ${body.message ?? JSON.stringify(body)}\n`);
  process.exit(1);
}

const objects = body.details?.objects ?? [];
if (objects.length === 0) {
  process.stderr.write("The solve succeeded but identified no objects; nothing worth replaying.\n");
  process.exit(1);
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(body, null, 2)}\n`);
process.stdout.write(
  `Saved ${objects.length} objects in ${((Date.now() - started) / 1000).toFixed(1)}s to ${path.relative(REPO, OUT)}\n`,
);
