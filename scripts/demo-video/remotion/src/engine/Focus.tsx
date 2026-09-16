import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import type { FocusRecord } from "./manifest";

/** Frames the highlight takes to appear and disappear. */
const RING_IN = 7;
const RING_OUT = 7;

/**
 * Widest a subject may be, as a fraction of the frame, before the ring is
 * dropped.
 *
 * In the phone layout a slider row spans almost the entire screen, so a ring
 * around it is not a highlight at all — it renders as two horizontal rules
 * across the picture, adding clutter without pointing at anything. There is
 * only ever one control being dragged on a phone, and the sheet ghosts itself
 * while it happens, so the emphasis is already unambiguous.
 */
const MAX_RING_WIDTH_RATIO = 0.7;

/** The focus span covering `frame`, if any. */
const activeFocus = (focuses: FocusRecord[], frame: number): FocusRecord | null =>
  focuses.find((focus) => frame >= focus.start && frame < focus.end) ?? null;

/**
 * A soft ring around the control being driven.
 *
 * It sits inside the same transform as the footage so it tracks the thing it is
 * pointing at rather than sliding against it, and it is a glow rather than a hard outline
 * so it reads as light falling on the control instead of a diagram annotation.
 */
export const FocusRing: React.FC<{ focuses: FocusRecord[] }> = ({ focuses }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const focus = activeFocus(focuses, frame);

  if (focus === null || focus.rect.width > width * MAX_RING_WIDTH_RATIO) {
    return null;
  }

  const span = focus.end - focus.start;
  const local = frame - focus.start;
  const opacity = interpolate(
    local,
    [0, RING_IN, Math.max(RING_IN + 1, span - RING_OUT), span],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const grow = interpolate(local, [0, RING_IN], [0.97, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: focus.rect.x,
        top: focus.rect.y,
        width: focus.rect.width,
        height: focus.rect.height,
        borderRadius: 18,
        border: `2px solid ${theme.cyan}`,
        boxShadow:
          `0 0 0 1px rgba(0,229,255,0.18), 0 0 34px rgba(0,229,255,0.38),` +
          ` inset 0 0 26px rgba(0,229,255,0.12)`,
        opacity: opacity * 0.9,
        transform: `scale(${grow})`,
        pointerEvents: "none",
      }}
    />
  );
};
