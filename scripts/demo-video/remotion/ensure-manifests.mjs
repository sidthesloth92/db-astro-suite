import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Writes an empty manifest for any cut that has not been captured yet.
 *
 * `Root.tsx` imports every manifest statically, so webpack needs all of them to
 * exist before it will bundle anything — without this, a clean checkout cannot
 * even open the Studio until every app and format has been captured, which is a
 * confusing failure for what is really just a missing artefact. An empty
 * manifest renders the cards and no footage.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const APPS = ["astrogram", "astrospike"];
const FRAME = {
  vertical: { width: 1080, height: 1920 },
  desktop: { width: 1920, height: 1080 },
};

for (const app of APPS) {
  for (const [format, { width, height }] of Object.entries(FRAME)) {
    const file = path.resolve(here, "..", "out", app, format, "beats.json");
    if (existsSync(file)) {
      continue;
    }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(
      file,
      `${JSON.stringify(
        { fps: 30, width, height, totalFrames: 1, clips: [], captions: [], focuses: [] },
        null,
        2,
      )}\n`,
    );
    process.stdout.write(`wrote an empty manifest for ${app} ${format}\n`);
  }
}
