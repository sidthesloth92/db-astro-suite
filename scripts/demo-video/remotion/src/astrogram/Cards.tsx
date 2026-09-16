import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../engine/theme";

/** How many stars the card backgrounds carry. */
const STAR_COUNT = 140;

/**
 * A slow-drifting starfield behind the cards and around the desktop footage.
 *
 * Seeded rather than random so every render of a given frame is identical —
 * Remotion renders frames out of order and in parallel, so anything genuinely
 * random would flicker. The drift is deliberately slow: at card length it reads
 * as depth rather than motion.
 */
export const Starfield: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const stars = React.useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        x: random(`x${i}`) * width,
        y: random(`y${i}`) * height,
        size: 1 + random(`s${i}`) * 2.4,
        base: 0.25 + random(`o${i}`) * 0.6,
        phase: random(`p${i}`) * Math.PI * 2,
        drift: 0.25 + random(`d${i}`) * 0.5,
      })),
    [width, height],
  );

  return (
    <AbsoluteFill>
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: star.x,
            top: star.y - frame * star.drift * 0.22,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: star.base * (0.72 + 0.28 * Math.sin(frame * 0.05 + star.phase)),
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** The ASTRO/GRAM wordmark, split the way the app's own header splits it. */
export const Wordmark: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      fontFamily: theme.display,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: size * 0.06,
      color: theme.textPrimary,
      whiteSpace: "nowrap",
    }}
  >
    ASTRO<span style={{ color: theme.neonPink }}>GRAM</span>
  </div>
);

/** Finished cards made with Astrogram, fanned out behind the title. */
const FAN = [
  { file: "astrogram/cards/astrogram-split-stats-portrait.jpg", aspect: 1080 / 1350, angle: -13, dx: -0.36 },
  { file: "astrogram/cards/astrogram-platesolve-example.jpg", aspect: 1080 / 1350, angle: 13, dx: 0.36 },
  { file: "astrogram/cards/astrogram-eclipse-landscape.jpg", aspect: 1080 / 566, angle: -3, dx: 0 },
] as const;

/**
 * Three real cards that spread out from behind the logo.
 *
 * They are the product's output, so they say what it makes before a word is
 * read; the fan opens on a spring and then drifts a little further so the card
 * never sits still.
 */
const CardFan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const open = spring({ frame, fps, config: { damping: 16, mass: 0.7 }, durationInFrames: 36 });
  const drift = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  // A landscape frame spreads the cards sideways behind the title; a portrait
  // frame is too narrow for that, so the portrait cards rise above the title
  // and the landscape card drops below it.
  const isTallFrame = height > width;
  const cardHeight = isTallFrame ? width * 0.62 : Math.min(width, height) * 0.62;
  const spread = isTallFrame ? width * 0.62 : Math.min(width, height * 1.1);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {FAN.map((card) => {
        const isWide = card.aspect > 1;
        const h = isWide ? (isTallFrame ? (width * 0.86) / card.aspect : cardHeight * 0.52) : cardHeight;
        const w = h * card.aspect;
        const x = card.dx * spread * open * (1 + 0.04 * drift);
        const y = isTallFrame
          ? (isWide ? height * 0.27 : -height * 0.25) * open
          : isWide
            ? cardHeight * 0.36 * open
            : -cardHeight * 0.04;
        return (
          <Img
            key={card.file}
            src={staticFile(card.file)}
            style={{
              position: "absolute",
              width: w,
              height: h,
              borderRadius: 14,
              objectFit: "cover",
              transform: `translate(${x}px, ${y}px) rotate(${card.angle * open}deg) scale(${0.86 + 0.14 * open})`,
              opacity: 0.5 * open,
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${theme.spaceBlack} 18%, rgba(5,5,8,0.55) 48%, transparent 75%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Opening card.
 *
 * It states what the tool is before any UI appears, so a viewer who scrolls
 * past after two seconds still knows what they saw.
 */
export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const scale = Math.min(width, height) / 1080;

  const rise = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.spaceBlack,
        justifyContent: "center",
        alignItems: "center",
        opacity: out,
      }}
    >
      <Starfield />
      <CardFan />
      <div
        style={{
          transform: `translateY(${interpolate(rise, [0, 1], [26, 0])}px)`,
          opacity: rise,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26 * scale,
        }}
      >
        <Img src={staticFile("astrogram/astrogram-mark.png")} style={{ width: 210 * scale, height: 210 * scale }} />
        <Wordmark size={96 * scale} />
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 600,
            fontSize: 38 * scale,
            color: theme.textPrimary,
            marginTop: 10 * scale,
            textAlign: "center",
            maxWidth: 900 * scale,
            lineHeight: 1.3,
            textShadow: "0 2px 18px rgba(0,0,0,0.9)",
          }}
        >
          Turn your astrophoto into a share-ready post.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Closing card: what it costs and where to find it. */
export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const scale = Math.min(width, height) / 1080;

  const rise = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  // Fades up over the last frames of footage rather than cutting to black.
  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.spaceBlack,
        justifyContent: "center",
        alignItems: "center",
        opacity: enter,
      }}
    >
      <Starfield />
      <div
        style={{
          opacity: rise,
          transform: `translateY(${interpolate(rise, [0, 1], [22, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28 * scale,
        }}
      >
        <Img src={staticFile("astrogram/astrogram-mark.png")} style={{ width: 170 * scale, height: 170 * scale }} />
        <Wordmark size={78 * scale} />
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 500,
            fontSize: 36 * scale,
            color: theme.textDim,
            letterSpacing: 1,
          }}
        >
          Free · Made for astrophotographers
        </div>
        <div
          style={{
            marginTop: 28 * scale,
            fontFamily: theme.display,
            fontWeight: 700,
            fontSize: 44 * scale,
            letterSpacing: 2,
            color: theme.cyan,
            textShadow: "0 0 30px rgba(0,229,255,0.4)",
          }}
        >
          dbastrosuite.com/astrogram
        </div>
        <div
          style={{
            marginTop: 6 * scale,
            fontFamily: theme.body,
            fontWeight: 600,
            fontSize: 38 * scale,
            letterSpacing: 1,
            color: theme.neonPink,
          }}
        >
          @astrowithdb
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * The chapter break between the card builder and the stellar map.
 *
 * The second half is a different mode on a different canvas — the photo stops
 * being a background and becomes the subject — so a hard cut there reads as a
 * mistake; a card reads as a new section.
 */
export const StellarMapSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const scale = Math.min(width, height) / 1080;

  const rise = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.spaceBlack,
        justifyContent: "center",
        alignItems: "center",
        opacity: Math.min(rise, out),
      }}
    >
      <Starfield />
      <div
        style={{
          transform: `translateY(${interpolate(rise, [0, 1], [20, 0])}px)`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22 * scale,
        }}
      >
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 600,
            fontSize: 34 * scale,
            letterSpacing: 9 * scale,
            textTransform: "uppercase",
            color: theme.cyan,
          }}
        >
          Next
        </div>
        <div
          style={{
            fontFamily: theme.display,
            fontWeight: 700,
            fontSize: 104 * scale,
            letterSpacing: 5 * scale,
            color: theme.textPrimary,
            whiteSpace: "nowrap",
          }}
        >
          STELLAR MAP
        </div>
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 500,
            fontSize: 38 * scale,
            color: theme.textDim,
            maxWidth: 900 * scale,
            lineHeight: 1.35,
          }}
        >
          Every object in your frame, named.
        </div>
      </div>
    </AbsoluteFill>
  );
};
