import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { CAPTION_FOR } from "../../../astrospike/captions";
import { Caption } from "./Caption";
import { MilkyWaySlide, OutroCard, TitleCard } from "./Cards";
import { FocusRing } from "../engine/Focus";
import { Fonts } from "../engine/fonts";
import { theme } from "../engine/theme";
import type { Format } from "../engine/format";
import { mergeCaptions } from "../engine/captions";
import {
  FOOTAGE_START,
  OUTRO_FRAMES,
  SLIDE_FRAMES,
  TITLE_FRAMES,
  buildLayout,
  placeCaptions,
  placeFocuses,
  type CutId,
} from "../engine/cut";
import type { CaptureManifest } from "../engine/manifest";

/** The clip the Diffusion half starts at. */
export const SLICE_BEFORE = "mw-empty";

/** Lays this video's cut out; re-exported so the Root can size compositions. */
export const layoutFor = (manifest: CaptureManifest, cut: CutId = "full") =>
  buildLayout(manifest, cut, SLICE_BEFORE);

/**
 * The finished video: captured footage bookended by cards, with the Milky Way
 * interstitial between its two halves.
 *
 * Clips within a half are consecutive slices of one continuous capture session,
 * so they are butt-joined rather than cross-dissolved — a transition between
 * them would invent a cut the recording does not have. Only the cards fade.
 *
 * The clip list, caption track and focus spans all come from the capture's own
 * `beats.json`, so nothing here restates a timing the capture already knows.
 * `cut` picks the spikes half, the Diffusion half or both; `overlay` turns the
 * captions and focus ring off for a version to caption elsewhere.
 */
export const DemoVideo: React.FC<{
  format: Format;
  manifest: CaptureManifest;
  cut?: CutId;
  overlay?: boolean;
}> = ({ format, manifest, cut = "full", overlay = true }) => {
  const layout = layoutFor(manifest, cut);
  const focuses = placeFocuses(layout, manifest.focuses ?? []);
  const captions = overlay ? placeCaptions(layout, mergeCaptions(manifest.captions, CAPTION_FOR)) : [];
  const milkyWayFrom = layout.boundary;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.spaceBlack }}>
      <Fonts />

      {layout.clips.map((clip) => (
        <Sequence key={clip.id} from={clip.at} durationInFrames={clip.frames}>
          <OffthreadVideo src={staticFile(`clips/astrospike/${format}/${clip.file}`)} />
        </Sequence>
      ))}

      {/* The frame never moves: the ring alone marks the active control. */}
      {overlay && <FocusRing focuses={focuses} />}

      {captions.map((caption, index) => {
        const duration = caption.end - caption.start;
        if (duration <= 0) {
          return null;
        }
        return (
          <Sequence
            key={`${index}-${caption.start}`}
            from={caption.start}
            durationInFrames={duration}
          >
            <Caption
              id={caption.id}
              durationInFrames={duration}
              format={format}
              // The second half starts at the clip that swaps the photograph.
              photo={
                milkyWayFrom !== null && caption.captureStart >= milkyWayFrom
                  ? "milkyWay"
                  : "pleiades"
              }
            />
          </Sequence>
        );
      })}

      {layout.slideStart !== null && (
        <Sequence from={layout.slideStart} durationInFrames={SLIDE_FRAMES}>
          <MilkyWaySlide />
        </Sequence>
      )}

      {/* Rendered after the footage so the fades happen on top of it. */}
      <Sequence durationInFrames={TITLE_FRAMES}>
        <TitleCard />
      </Sequence>

      <Sequence from={layout.outroStart} durationInFrames={OUTRO_FRAMES}>
        <OutroCard />
      </Sequence>
    </AbsoluteFill>
  );
};

export { FOOTAGE_START, OUTRO_FRAMES, SLIDE_FRAMES, TITLE_FRAMES };
