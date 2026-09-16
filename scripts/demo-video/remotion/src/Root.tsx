import React from "react";
import { Composition } from "remotion";
import astrogramDesktop from "../../out/astrogram/desktop/beats.json";
import astrogramVertical from "../../out/astrogram/vertical/beats.json";
import astrospikeDesktop from "../../out/astrospike/desktop/beats.json";
import astrospikeVertical from "../../out/astrospike/vertical/beats.json";
import { DemoVideo as AstrogramVideo, layoutFor as astrogramLayout } from "./astrogram/DemoVideo";
import { DemoVideo as AstroSpikeVideo, layoutFor as astrospikeLayout } from "./astrospike/DemoVideo";
import type { CutId } from "./engine/cut";
import type { Format } from "./engine/format";
import type { CaptureManifest } from "./engine/manifest";

/**
 * Registers every video: each app, each half, each shape, with and without the
 * caption overlay.
 *
 * A composition is one recipe over the same footage — the halves are cut from
 * one capture rather than recorded again — so the whole grid costs nothing but
 * render time, and re-capturing an app refreshes all twelve of its videos.
 *
 * Ids read `<App><Shape><Cut><Clean>`, and the plain `AstrogramDesktop` style
 * id stays the full cut with captions, as it was before the halves existed.
 */
const APPS = [
  {
    name: "Astrogram",
    component: AstrogramVideo,
    layout: astrogramLayout,
    manifests: {
      desktop: astrogramDesktop as CaptureManifest,
      vertical: astrogramVertical as CaptureManifest,
    },
    cuts: [
      { id: "full" as CutId, suffix: "" },
      { id: "first" as CutId, suffix: "Card" },
      { id: "second" as CutId, suffix: "Map" },
    ],
  },
  {
    name: "AstroSpike",
    component: AstroSpikeVideo,
    layout: astrospikeLayout,
    manifests: {
      desktop: astrospikeDesktop as CaptureManifest,
      vertical: astrospikeVertical as CaptureManifest,
    },
    cuts: [
      { id: "full" as CutId, suffix: "" },
      { id: "first" as CutId, suffix: "Spikes" },
      { id: "second" as CutId, suffix: "Diffusion" },
    ],
  },
];

const SHAPES = [
  { format: "desktop" as Format, suffix: "Desktop", width: 1920, height: 1080 },
  { format: "vertical" as Format, suffix: "Vertical", width: 1080, height: 1920 },
];

export const Root: React.FC = () => (
  <>
    {APPS.flatMap((app) =>
      SHAPES.flatMap((shape) =>
        app.cuts.flatMap((cut) =>
          [true, false].map((overlay) => {
            const manifest = app.manifests[shape.format];
            const id = `${app.name}${shape.suffix}${cut.suffix}${overlay ? "" : "Clean"}`;
            return (
              <Composition
                key={id}
                id={id}
                component={app.component}
                defaultProps={{ format: shape.format, manifest, cut: cut.id, overlay }}
                durationInFrames={app.layout(manifest, cut.id).totalFrames}
                fps={30}
                width={shape.width}
                height={shape.height}
              />
            );
          }),
        ),
      ),
    )}
  </>
);
