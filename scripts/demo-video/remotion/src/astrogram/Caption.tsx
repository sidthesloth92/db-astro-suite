import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS } from "../../../astrogram/captions";
import { theme } from "../engine/theme";
import type { Format } from "../engine/format";
import type { Rect } from "../engine/manifest";

/** How long a caption takes to arrive and to leave, in frames. */
const FADE_IN = 10;
const FADE_OUT = 7;

/** How far the card travels in from the left as it arrives, in px. */
const SLIDE_PX = 40;

/**
 * Type sizes per format.
 *
 * A caption is laid over the card's own "@astrogram" header bar — the one solid
 * strip that is in the same place in both layouts and both modes — so the sizes
 * are chosen to sit inside that bar: about 65 CSS px tall on desktop and 62 on
 * a phone, which the capture's scale factors turn into roughly 81 and 155
 * finished pixels.
 */
const STYLE = {
  vertical: { body: 40, kicker: 28, bar: 7, maxWidth: 1000 },
  desktop: { body: 30, kicker: 21, bar: 5, maxWidth: 1400 },
} as const;

/**
 * Where a caption goes when the manifest has no header rectangle — footage
 * captured before the edit started measuring it.
 */
const FALLBACK_ANCHOR = {
  vertical: { x: 44, y: 280, width: 1000 },
  desktop: { x: 320, y: 165, width: 600 },
} as const;

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
 * It sits on a glass card with a pink accent bar so it stays readable over the
 * bright card and nebula behind it on a phone. The card is deliberately
 * see-through, with no backdrop blur, so the app behind the words is still
 * visible; the motion (slide, bar, typed heading, one glow pulse) is what draws
 * the eye, not the card's weight.
 */
export const Caption: React.FC<{
  id: string;
  durationInFrames: number;
  format: Format;
  header?: Rect;
}> = ({ id, durationInFrames, format, header }) => {
  const frame = useCurrentFrame();
  const style = STYLE[format];
  const text = CAPTIONS[id as keyof typeof CAPTIONS] ?? id;

  // `interpolate` requires a strictly increasing input range, and a caption can
  // be shorter than the two fades put together — the capture warns about those,
  // but the edit must still render them rather than throw.
  const span = Math.max(2, durationInFrames);
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

  const bar = header ?? FALLBACK_ANCHOR[format];
  // Pinned to the bar's top rather than centred on it: the card is a little
  // taller than the bar on desktop, and hanging the overflow downward puts it
  // over the photograph rather than over the app's toolbar above.
  const anchor = { left: bar.x, top: bar.y, width: bar.width };

  return (
    <div
      style={{
        position: "absolute",
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
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
          // Opaque, and exactly as wide as the bar it covers: the header holds
          // the handle and the export button, and a see-through card let them
          // collide with the words.
          background: "rgb(8,10,18)",
          flex: "1 1 auto",
          border: `1px solid rgba(0,229,255,${0.28 + 0.3 * pulse})`,
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
            whiteSpace: "nowrap",
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
