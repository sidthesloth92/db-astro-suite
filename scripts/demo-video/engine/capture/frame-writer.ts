import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Streams PNG frame buffers straight into an ffmpeg process, one clip per
 * instance.
 *
 * Frames are never written to disk: a 92-second 1080x1920 capture is roughly
 * 2,700 PNGs at ~1.5 MB each, and piping them keeps that ~4 GB out of the
 * filesystem entirely. The intermediate is encoded near-losslessly (CRF 14)
 * because Remotion re-encodes it afterwards and compounding two lossy passes
 * over faint, low-contrast glow halos is exactly how they disappear.
 */
export class FrameWriter {
  private readonly proc: ChildProcess;
  private frames = 0;

  private constructor(outPath: string, fps: number) {
    mkdirSync(path.dirname(outPath), { recursive: true });
    this.proc = spawn("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-f", "image2pipe",
      "-vcodec", "png",
      "-framerate", String(fps),
      "-i", "-",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "14",
      // Every frame a keyframe. Remotion renders frames out of order across
      // several tabs, so each one is a random seek into these clips; with a
      // normal GOP the decoder walks from the previous keyframe every time and
      // the render times out. All-intra costs disk, which out/ is not short of.
      "-g", "1",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outPath,
    ]);
    this.proc.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  }

  /** Opens an ffmpeg pipe writing to `outPath` at `fps`. */
  static open(outPath: string, fps: number): FrameWriter {
    return new FrameWriter(outPath, fps);
  }

  /** Appends one PNG frame, respecting the pipe's backpressure. */
  async write(buffer: Buffer): Promise<void> {
    this.frames += 1;
    const stdin = this.proc.stdin;
    if (stdin === null) {
      throw new Error("ffmpeg stdin closed before the clip finished");
    }
    if (!stdin.write(buffer)) {
      await once(stdin, "drain");
    }
  }

  /** Closes the pipe, waits for ffmpeg to exit, and reports the frame count. */
  async close(): Promise<number> {
    this.proc.stdin?.end();
    const [code] = (await once(this.proc, "close")) as [number];
    if (code !== 0) {
      throw new Error(`ffmpeg exited with code ${code}`);
    }
    return this.frames;
  }
}
