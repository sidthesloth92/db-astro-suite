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
import type { CaptureManifest } from "../engine/manifest";

/** Frames the opening card holds before the studio appears. */
export const TITLE_FRAMES = 90;

/** Frames the closing card holds. */
export const OUTRO_FRAMES = 150;

/** Frames the "Milky Way mode" interstitial holds, mid-video. */
export const SLIDE_FRAMES = 75;

/** How far the cards overlap their neighbours, so nothing cuts in hard. */
const TITLE_OVERLAP = 12;
const OUTRO_OVERLAP = 10;

/** Where the captured footage starts on the finished timeline. */
export const FOOTAGE_START = TITLE_FRAMES - TITLE_OVERLAP;

/** The clip the interstitial is played in front of. */
const SLIDE_BEFORE_CLIP = "mw-empty";

/** Everything the edit needs to lay a format out. */
export interface Layout {
  slideStart: number | null;
  shift(frame: number): number;
  outroStart: number;
  totalFrames: number;
}

/**
 * Works out where the interstitial goes and how much everything after it moves.
 *
 * The slide is an edit-time insertion — the capture knows nothing about it — so
 * the footage on either side has to be pushed apart to make room rather than
 * having a chunk of it covered up and lost.
 */
export const layoutFor = (manifest: CaptureManifest): Layout => {
  const slideClip = manifest.clips.find((clip) => clip.id === SLIDE_BEFORE_CLIP);
  const slideStart = slideClip === undefined ? null : slideClip.start;
  const shift = (frame: number): number =>
    slideStart !== null && frame >= slideStart ? frame + SLIDE_FRAMES : frame;
  const outroStart =
    FOOTAGE_START + shift(manifest.totalFrames) - OUTRO_OVERLAP;
  return {
    slideStart,
    shift,
    outroStart,
    totalFrames: outroStart + OUTRO_FRAMES,
  };
};

/**
 * The finished video: captured footage with captions, bookended by cards and
 * split in half by the Milky Way interstitial.
 *
 * Clips within a half are consecutive slices of one continuous capture session,
 * so they are butt-joined rather than cross-dissolved — a transition between
 * them would invent a cut the recording does not have. Only the cards fade.
 *
 * Both the clip list and the caption track come from the capture's own
 * `beats.json`, so nothing here restates a timing the capture already knows and
 * captions cannot drift away from the footage they describe.
 */
export const DemoVideo: React.FC<{
  format: Format;
  manifest: CaptureManifest;
}> = ({ format, manifest }) => {
  const { slideStart, shift, outroStart } = layoutFor(manifest);

  // Focus spans are recorded in capture-frame space, like everything else the
  // manifest holds, so they move with the footage when the slide pushes the
  // second half of the video along.
  const focuses = (manifest.focuses ?? []).map((focus) => ({
    ...focus,
    start: FOOTAGE_START + shift(focus.start),
    end: FOOTAGE_START + shift(focus.end),
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: theme.spaceBlack }}>
      <Fonts />

      {manifest.clips.map((clip) => (
        <Sequence
          key={clip.id}
          from={FOOTAGE_START + shift(clip.start)}
          durationInFrames={clip.frames}
        >
          <OffthreadVideo src={staticFile(`clips/astrospike/${format}/${clip.file}`)} />
        </Sequence>
      ))}

      {/* The frame never moves: the ring alone marks the active control. */}
      <FocusRing focuses={focuses} />

      {mergeCaptions(manifest.captions, CAPTION_FOR).map((caption, index) => {
        const duration = caption.end - caption.start;
        if (duration <= 0) {
          return null;
        }
        return (
          <Sequence
            key={`${index}-${caption.start}`}
            from={FOOTAGE_START + shift(caption.start)}
            durationInFrames={duration}
          >
            <Caption
              id={caption.id}
              durationInFrames={duration}
              format={format}
              // The second half starts at the clip that swaps the photograph.
              photo={slideStart !== null && caption.start >= slideStart ? "milkyWay" : "pleiades"}
            />
          </Sequence>
        );
      })}

      {slideStart !== null && (
        <Sequence from={FOOTAGE_START + slideStart} durationInFrames={SLIDE_FRAMES}>
          <MilkyWaySlide />
        </Sequence>
      )}

      {/* Rendered after the footage so the fades happen on top of it. */}
      <Sequence durationInFrames={TITLE_FRAMES}>
        <TitleCard />
      </Sequence>

      <Sequence from={outroStart} durationInFrames={OUTRO_FRAMES}>
        <OutroCard />
      </Sequence>
    </AbsoluteFill>
  );
};
