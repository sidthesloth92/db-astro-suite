import React from "react";
import { staticFile } from "remotion";
import { FONT_FACES } from "./theme";

/**
 * Registers the site's type: Outfit, in the weights the cards and captions use.
 *
 * The files are served from the Remotion public directory rather than fetched
 * from Google Fonts, so a render never depends on the network and the faces
 * match the ones the studio itself ships.
 *
 * They are copies of `libs/theme/fonts`, not symlinks: Remotion's bundler
 * copies `public/` without following file symlinks, so a linked font is a 404
 * at render time. Refresh them if the theme's faces ever change.
 */
export const Fonts: React.FC = () => {
  const css = FONT_FACES.replace("__OUTFIT_500__", staticFile("fonts/outfit-500.woff2"))
    .replace("__OUTFIT_600__", staticFile("fonts/outfit-600.woff2"))
    .replace("__OUTFIT_700__", staticFile("fonts/outfit-700.woff2"))
    .replace("__OUTFIT_800__", staticFile("fonts/outfit-800.woff2"));
  return <style>{css}</style>;
};
