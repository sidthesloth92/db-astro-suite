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
 * A slow-drifting starfield behind the cards.
 *
 * Seeded rather than random so every render of a given frame is identical —
 * Remotion renders frames out of order and in parallel, so anything genuinely
 * random would flicker. The drift is deliberately slower than it looks like it
 * should be: at card length it reads as depth rather than motion.
 */
const Starfield: React.FC = () => {
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

/**
 * A diffraction burst that fires once behind the wordmark.
 *
 * It is the product's own subject matter used as the open: four arms extend
 * fast, overshoot, and settle. Cheap to draw and it says what the tool does
 * before a word is read.
 */
const SpikeBurst: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const grow = spring({ frame, fps, config: { damping: 14, mass: 0.6 }, durationInFrames: 34 });
  const length = interpolate(grow, [0, 1], [0, size]);
  const fade = interpolate(frame, [10, 46], [0.85, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const arm = (rotation: number): React.CSSProperties => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    width: length,
    height: 2,
    marginLeft: -length / 2,
    transform: `rotate(${rotation}deg)`,
    background:
      "linear-gradient(90deg, transparent, rgba(0,229,255,0.9) 35%," +
      " rgba(255,255,255,0.95) 50%, rgba(255,45,149,0.9) 65%, transparent)",
    opacity: fade,
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={arm(0)} />
      <div style={arm(90)} />
      <div style={arm(45)} />
      <div style={arm(-45)} />
    </div>
  );
};

/** The ASTRO/SPIKE wordmark, split so the accent half matches the product. */
const Wordmark: React.FC<{ size: number }> = ({ size }) => (
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
    ASTRO<span style={{ color: theme.neonPink }}>SPIKE</span>
  </div>
);

/**
 * Real AstroSpike results, fanned out behind the title.
 *
 * Stills from this capture's own footage, cropped inside the photo so no studio
 * chrome shows: a six-armed JWST Pleiades, a four-armed close-up, and the Milky
 * Way in Diffusion mode. They say what the tool makes before a word is read.
 */
const SHOTS = [
  { file: "astrospike/intro/milky-way-glow.jpg", aspect: 780 / 910, angle: -12, dx: -0.36 },
  { file: "astrospike/intro/pleiades-closeup.jpg", aspect: 1, angle: 11, dx: 0.36 },
  { file: "astrospike/intro/pleiades-jwst.jpg", aspect: 1236 / 790, angle: -3, dx: 0 },
] as const;

/**
 * Spreads {@link SHOTS} out from behind the logo on a spring, then lets them
 * drift a little further so the frame never sits still. A landscape frame fans
 * them sideways; a portrait frame is too narrow for that, so the two upright
 * shots rise above the title and the wide one drops below it.
 */
const ShotFan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const open = spring({ frame, fps, config: { damping: 16, mass: 0.7 }, durationInFrames: 36 });
  const drift = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  const isTallFrame = height > width;
  const shotHeight = isTallFrame ? width * 0.62 : Math.min(width, height) * 0.62;
  const spread = isTallFrame ? width * 0.62 : Math.min(width, height * 1.1);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {SHOTS.map((shot) => {
        const isWide = shot.aspect > 1.2;
        const h = isWide
          ? isTallFrame
            ? (width * 0.86) / shot.aspect
            : shotHeight * 0.6
          : shotHeight;
        const w = h * shot.aspect;
        const x = shot.dx * spread * open * (1 + 0.04 * drift);
        const y = isTallFrame
          ? (isWide ? height * 0.31 : -height * 0.25) * open
          : isWide
            ? shotHeight * 0.56 * open
            : -shotHeight * 0.04;
        return (
          <Img
            key={shot.file}
            src={staticFile(shot.file)}
            style={{
              position: "absolute",
              width: w,
              height: h,
              borderRadius: 14,
              objectFit: "cover",
              transform: `translate(${x}px, ${y}px) rotate(${shot.angle * open}deg) scale(${0.86 + 0.14 * open})`,
              // Astrophotos are mostly black sky, so they need nearly full
              // strength to read as pictures behind the title at all.
              opacity: 0.85 * open,
              filter: "brightness(1.15) saturate(1.15)",
              border: "1px solid rgba(0,229,255,0.18)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          // Only as dark as the title needs: a tight pool behind the words,
          // so the shots stay bright at the edges.
          background: `radial-gradient(ellipse 48% 40% at center, rgba(5,5,8,0.92) 0%, rgba(5,5,8,0.7) 55%, transparent 100%)`,
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
  const { fps, durationInFrames } = useVideoConfig();

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
      <ShotFan />
      <div
        style={{
          transform: `translateY(${interpolate(rise, [0, 1], [26, 0])}px)`,
          opacity: rise,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
        }}
      >
        <div style={{ position: "relative", width: 190, height: 190 }}>
          <SpikeBurst size={760} />
          <Img src={staticFile("astrospike/astrospike-mark.svg")} style={{ width: 190, height: 190 }} />
        </div>
        <Wordmark size={96} />
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: theme.cyan,
            textShadow: "0 2px 16px rgba(0,0,0,0.95)",
          }}
        >
          Diffraction Spike Studio
        </div>
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 500,
            fontSize: 36,
            color: theme.textPrimary,
            marginTop: 18,
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.35,
            textShadow: "0 2px 18px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.8)",
          }}
        >
          Give your astrophotos diffraction spikes — in your browser.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Closing card: what it costs, what it needs, and where to find it. */
export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
          gap: 30,
        }}
      >
        <Img src={staticFile("astrospike/astrospike-mark.svg")} style={{ width: 150, height: 150 }} />
        <Wordmark size={78} />
        <div
          style={{
            fontFamily: theme.body,
            fontWeight: 500,
            fontSize: 36,
            color: theme.textDim,
            letterSpacing: 1,
          }}
        >
          No login · Free · Runs entirely in your browser
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: theme.display,
            fontWeight: 700,
            fontSize: 44,
            letterSpacing: 2,
            color: theme.cyan,
            textShadow: "0 0 30px rgba(0,229,255,0.4)",
          }}
        >
          dbastrosuite.com/astrospike
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: theme.body,
            fontWeight: 600,
            fontSize: 38,
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
 * The chapter break between the spike half of the video and the wide-field
 * half.
 *
 * It exists because the second half is not more of the same: the tool stops
 * drawing spikes entirely and starts blooming stars, on a different photograph.
 * A hard cut there reads as a mistake; a card reads as a new section.
 */
export const MilkyWaySlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const scale = Math.min(width, height) / 1080;

  const rise = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
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
          MILKY WAY MODE
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
          Wide fields want the opposite of spikes.
        </div>
      </div>
    </AbsoluteFill>
  );
};
