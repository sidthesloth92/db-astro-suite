import React from "react";
import { Composition } from "remotion";
import astrogramDesktop from "../../out/astrogram/desktop/beats.json";
import astrogramVertical from "../../out/astrogram/vertical/beats.json";
import astrospikeDesktop from "../../out/astrospike/desktop/beats.json";
import astrospikeVertical from "../../out/astrospike/vertical/beats.json";
import { DemoVideo as AstrogramVideo, layoutFor as astrogramLayout } from "./astrogram/DemoVideo";
import { DemoVideo as AstroSpikeVideo, layoutFor as astrospikeLayout } from "./astrospike/DemoVideo";
import type { CaptureManifest } from "./engine/manifest";

/**
 * Registers every cut of every demo video.
 *
 * Each composition reads the manifest its own capture pass wrote, so the cuts
 * are independent: re-capturing one app or one format never disturbs another's
 * timing. One Studio shows them all, which is why the two apps' videos share a
 * project rather than keeping a Remotion install each.
 */
const MANIFESTS = {
  astrogramDesktop: astrogramDesktop as CaptureManifest,
  astrogramVertical: astrogramVertical as CaptureManifest,
  astrospikeDesktop: astrospikeDesktop as CaptureManifest,
  astrospikeVertical: astrospikeVertical as CaptureManifest,
};

const VERTICAL = { fps: 30, width: 1080, height: 1920 } as const;
const DESKTOP = { fps: 30, width: 1920, height: 1080 } as const;

export const Root: React.FC = () => (
  <>
    <Composition
      id="AstrogramVertical"
      component={AstrogramVideo}
      defaultProps={{ format: "vertical" as const, manifest: MANIFESTS.astrogramVertical }}
      durationInFrames={astrogramLayout(MANIFESTS.astrogramVertical).totalFrames}
      {...VERTICAL}
    />
    <Composition
      id="AstrogramDesktop"
      component={AstrogramVideo}
      defaultProps={{ format: "desktop" as const, manifest: MANIFESTS.astrogramDesktop }}
      durationInFrames={astrogramLayout(MANIFESTS.astrogramDesktop).totalFrames}
      {...DESKTOP}
    />
    <Composition
      id="AstroSpikeVertical"
      component={AstroSpikeVideo}
      defaultProps={{ format: "vertical" as const, manifest: MANIFESTS.astrospikeVertical }}
      durationInFrames={astrospikeLayout(MANIFESTS.astrospikeVertical).totalFrames}
      {...VERTICAL}
    />
    <Composition
      id="AstroSpikeDesktop"
      component={AstroSpikeVideo}
      defaultProps={{ format: "desktop" as const, manifest: MANIFESTS.astrospikeDesktop }}
      durationInFrames={astrospikeLayout(MANIFESTS.astrospikeDesktop).totalFrames}
      {...DESKTOP}
    />
  </>
);
