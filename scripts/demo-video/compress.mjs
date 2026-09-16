import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Makes a smaller companion for each rendered master.
 *
 * The masters are encoded for quality (CRF 18) and are the ones to archive or
 * hand to anywhere that re-encodes for itself. The compressed pair is for
 * sending around and embedding, where a 40MB file is a nuisance and the
 * difference is invisible at normal playback size.
 *
 * The nebula backgrounds and the cards' soft gradients are the risk here: they
 * are low-contrast, wide-area fills, which is exactly what a quality-based
 * encoder spends the fewest bits on. CRF 26 keeps them from banding.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "out");
const CRF = process.env.DEMO_COMPRESS_CRF ?? "26";

const mib = (file) => (statSync(file).size / 1048576).toFixed(1);

/** Which videos to compress; pass app names as arguments to narrow it down. */
const APPS = process.argv.slice(2).length ? process.argv.slice(2) : ["astrogram", "astrospike"];

for (const cut of APPS.flatMap((app) => ["desktop", "vertical"].map((format) => ({ app, format })))) {
  const { app, format } = cut;
  const master = path.join(OUT, `${app}-demo-${format}.mp4`);
  if (!existsSync(master)) {
    process.stdout.write(`skipping ${app} ${format}: no master rendered yet\n`);
    continue;
  }
  const small = path.join(OUT, `${app}-demo-${format}-compressed.mp4`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-i", master,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", CRF,
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    small,
  ]);
  process.stdout.write(
    `${app} ${format}: ${mib(master)} MiB master -> ${mib(small)} MiB compressed\n`,
  );
}
