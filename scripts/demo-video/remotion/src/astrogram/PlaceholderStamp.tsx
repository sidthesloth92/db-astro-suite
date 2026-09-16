import React from "react";
import { useVideoConfig } from "remotion";
import { theme } from "../engine/theme";

/**
 * A loud marker over footage whose plate solve is the hand-written placeholder.
 *
 * The placeholder's labels only approximate the real objects, so a take made
 * from it is a draft of the edit, not something to post. Stamping it in the
 * render means a draft cannot be mistaken for the finished video; the stamp
 * disappears on its own once a real solve is recorded and re-captured.
 */
export const PlaceholderStamp: React.FC = () => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width, height) / 1080;
  return (
    <div
      style={{
        position: "absolute",
        // Bottom right, clear of the captions on the card header above.
        bottom: 28 * scale,
        right: 28 * scale,
        padding: `${10 * scale}px ${18 * scale}px`,
        borderRadius: 10 * scale,
        border: `2px dashed ${theme.neonPink}`,
        background: "rgba(5,5,8,0.78)",
        fontFamily: theme.display,
        fontWeight: 700,
        fontSize: 22 * scale,
        letterSpacing: 3 * scale,
        color: theme.neonPink,
      }}
    >
      PLACEHOLDER SOLVE
    </div>
  );
};
