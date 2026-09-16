import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../../../astrospike/captions";
import { captionHold } from "../engine/caption-hold";
import { theme } from "../engine/theme";
import type { Format } from "../engine/format";

/** How long a caption takes to arrive and to leave, in frames. */
const FADE_IN = 10;
const FADE_OUT = 7;

/** How far the card travels in from the left as it arrives, in px. */
const SLIDE_PX = 40;

/** Which photograph is on the stage while a caption is showing. */
export type StagePhoto = "pleiades" | "milkyWay";

/**
 * Where the photograph sits in the desktop frame, in finished-frame pixels.
 *
 * Measured off captured frames (`02-magnitude.mp4`, `13-diffusion.mp4`). The
 * studio fits the photo to its stage by aspect ratio, so the Pleiades frame
 * (1.6) fills the stage's width while the Milky Way frame (0.92) fills its
 * height and sits between black bars. A caption pinned to the frame would drift
 * off the picture for the whole second half; pinning it to the photo keeps it
 * above the "ORIGINAL" tag in both.
 */
const DESKTOP_PHOTO: Record<StagePhoto, { left: number; bottom: number }> = {
  pleiades: { left: 48, bottom: 1008 },
  milkyWay: { left: 289, bottom: 1063 },
};

/**
 * How far above the photo's bottom edge the desktop card sits.
 *
 * Two things live along that edge: the "ORIGINAL" tag (top at about 45px up)
 * and, in the tune-star beat, the floating per-star bar (top at y 955, 53px up
 * on the Pleiades frame). 80 clears both with room to spare.
 */
const DESKTOP_LIFT = 80;

/** The tag's own inset from the photo's left edge (12 CSS px at 1.25x). */
const DESKTOP_TAG_INSET = 15;

/**
 * Type sizes per format.
 *
 * Vertical sits top left: on a phone the controls sheet rises over the lower
 * half of the screen for every slider beat, so a bottom caption would cover the
 * very control being demonstrated. The inset clears the compare divider on the
 * left edge and the app header above.
 */
const STYLE = {
  vertical: { body: 52, kicker: 36, bar: 8, maxWidth: 760 },
  desktop: { body: 44, kicker: 32, bar: 5, maxWidth: 820 },
} as const;

/**
 * The phone cut's caption sits at the bottom left, where the desktop cut's
 * does: the product owner wants one place for it in every video. It overlaps
 * the controls sheet there, so the card is lighter than the desktop one and
 * leaves once it has been read (see {@link captionHold}).
 */
const VERTICAL_ANCHOR = { left: 48, bottom: 150 };

/**
 * One on-screen caption.
 *
 * The words come from `captions.ts` by id rather than from the capture, so the
 * wording can be changed and re-rendered without re-recording the footage.
 *
 * A caption written as "GLOW — A halo on the brightest stars" splits on the
 * dash: the name takes the display face in cyan and the explanation takes the
 * body face, which gives every beat a heading without a second caption track.
 *
 * It sits on a glass card with a pink accent bar, because plain shadowed text
 * vanished over the bright nebula. The card is deliberately see-through — a
 * gradient from light to almost nothing, and no backdrop blur, which even at
 * 3px wiped out the stars behind it — since this is a demo of an image editor
 * and the picture behind the words has to stay readable. The motion (slide, bar, typed heading, one glow pulse) is what
 * draws the eye, not the card's weight.
 */
export const Caption: React.FC<{
  id: string;
  durationInFrames: number;
  format: Format;
  photo: StagePhoto;
}> = ({ id, durationInFrames, format, photo }) => {
  const frame = useCurrentFrame();
  const style = STYLE[format];
  const text = CAPTIONS[id as keyof typeof CAPTIONS] ?? id;

  // `interpolate` requires a strictly increasing input range, and a caption can
  // be shorter than the two fades put together — the capture warns about those,
  // but the edit must still render them rather than throw.
  const span = Math.max(2, format === "vertical" ? captionHold(text, durationInFrames) : durationInFrames);
  const fadeIn = Math.max(1, Math.min(FADE_IN, Math.floor(span / 3)));
  const fadeOut = Math.max(1, Math.min(FADE_OUT, Math.floor(span / 3)));
  const holdUntil = Math.max(fadeIn + 1, span - fadeOut);
  // Every entrance step scales with the fade, so a short caption compresses its
  // choreography rather than cutting it off.
  const step = fadeIn / FADE_IN;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  const opacity = interpolate(frame, [0, fadeIn, holdUntil, span], [0, 1, 1, 0], clamp);
  const slide = interpolate(frame, [0, 8 * step + 0.01], [-SLIDE_PX, 0], {
    ...clamp,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const barGrow = interpolate(frame, [3 * step, 11 * step + 0.01], [0, 1], clamp);
  const typed = interpolate(frame, [6 * step, 16 * step + 0.01], [0, 1], clamp);
  const pulse = interpolate(frame, [8 * step, 13 * step + 0.01, 20 * step + 0.02], [0, 1, 0], clamp);

  const [lead, ...rest] = text.split(" — ");
  const tail = rest.join(" — ");
  const heading = tail !== "" ? lead : "";
  const line = tail === "" ? lead : tail;
  // Hidden letters stay in the layout, so the card is its final size from the
  // first frame and only the ink appears.
  const shown = Math.round(heading.length * typed);

  const shadow = "0 2px 8px rgba(0,0,0,0.9), 0 3px 22px rgba(0,0,0,0.6)";

  const anchor =
    format === "vertical"
      ? { left: VERTICAL_ANCHOR.left, bottom: VERTICAL_ANCHOR.bottom }
      : {
          left: DESKTOP_PHOTO[photo].left + DESKTOP_TAG_INSET,
          bottom: 1080 - (DESKTOP_PHOTO[photo].bottom - DESKTOP_LIFT),
        };

  return (
    <div
      style={{
        position: "absolute",
        ...anchor,
        maxWidth: style.maxWidth,
        opacity,
        transform: `translateX(${slide}px)`,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          width: style.bar,
          flex: "0 0 auto",
          borderRadius: style.bar,
          background: theme.neonPink,
          transform: `scaleY(${barGrow})`,
          boxShadow: `0 0 ${14 + 16 * pulse}px rgba(255,45,149,${0.8 + 0.2 * pulse})`,
        }}
      />
      <div
        style={{
          padding: `${style.body * 0.4}px ${style.body * 0.6}px ${style.body * 0.45}px`,
          background:
            "linear-gradient(90deg, rgba(5,6,10,0.3) 0%, rgba(5,6,10,0.18) 55%, rgba(5,6,10,0.06) 100%)",
          border: `1px solid rgba(0,229,255,${0.2 + 0.24 * pulse})`,
          borderLeft: "none",
          borderRadius: `0 ${style.body * 0.22}px ${style.body * 0.22}px 0`,
          boxShadow: `0 0 ${24 + 18 * pulse}px rgba(0,229,255,${0.18 + 0.2 * pulse})`,
        }}
      >
        {heading !== "" && (
          <div
            style={{
              fontFamily: theme.display,
              fontWeight: 700,
              fontSize: style.kicker,
              letterSpacing: style.kicker * 0.1,
              textTransform: "uppercase",
              color: theme.cyan,
              textShadow: `0 0 22px rgba(0,229,255,0.45), ${shadow}`,
              marginBottom: style.kicker * 0.22,
              whiteSpace: "nowrap",
            }}
          >
            {heading.slice(0, shown)}
            <span style={{ color: "transparent", textShadow: "none" }}>
              {heading.slice(shown)}
            </span>
          </div>
        )}
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 600,
            fontSize: style.body,
            lineHeight: 1.2,
            color: "#ffffff",
            textShadow: shadow,
          }}
        >
          {line}
        </div>
      </div>
    </div>
  );
};
