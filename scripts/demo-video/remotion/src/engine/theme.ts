/**
 * Colours and type mirrored from `libs/theme/tokens.css`, so the video's own
 * chrome reads as the same product as the studio it is showing.
 *
 * Copied rather than imported: this package lives outside the pnpm workspace on
 * purpose, and a build tool reaching into the suite's libraries would be the
 * kind of dependency the repo's graph rules exist to prevent.
 */
export const theme = {
  spaceBlack: "#050508",
  surface: "#05060A",
  cyan: "#00E5FF",
  neonPink: "#ff2d95",
  textPrimary: "#e0e0e0",
  textDim: "#8B92A6",
  // The hub sets its headings in Outfit (`--db-font-display-major`), and the
  // product owner wants the videos to read as the same site. Orbitron is only
  // still in the app shells' own logos, which the footage shows as they are.
  display: '"Outfit", system-ui, sans-serif',
  body: '"Outfit", system-ui, -apple-system, sans-serif',
} as const;

/** Injected once so every weight is available to every scene. */
export const FONT_FACES = `
@font-face {
  font-family: "Outfit";
  src: url("__OUTFIT_500__") format("woff2");
  font-weight: 500;
  font-display: block;
}
@font-face {
  font-family: "Outfit";
  src: url("__OUTFIT_600__") format("woff2");
  font-weight: 600;
  font-display: block;
}
@font-face {
  font-family: "Outfit";
  src: url("__OUTFIT_700__") format("woff2");
  font-weight: 700;
  font-display: block;
}
@font-face {
  font-family: "Outfit";
  src: url("__OUTFIT_800__") format("woff2");
  font-weight: 800;
  font-display: block;
}
`;
