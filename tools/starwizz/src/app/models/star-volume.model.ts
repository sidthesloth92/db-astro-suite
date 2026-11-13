import {
  ARRIVE_VOLUME_NEAR,
  DEPTH_RANK_WEIGHT,
  GIANT_SPIKE_AMP,
  GIANT_SPIKE_EXTENT,
  GIANT_SPIKE_MIN_WIDTH,
  GIANT_SPIKE_WIDTH_FACTOR,
  SHARP_EXTENT,
  SHARP_MIN_SCREEN_PX,
  SPIKE_EXTENT_BASE,
  SPIKE_EXTENT_RANGE,
  SPIKE_FRACTION_PER_UNIT,
  SPIKE_MIN_STRENGTH,
  STAR_DYNAMIC_STRIDE,
  STAR_FADE_IN_SECONDS,
  STAR_STATIC_STRIDE,
  VOLUME_MARGIN,
  VOLUME_NEAR,
} from '../constants/scene3d.constant';
import { TWINKLE_SPEED } from '../constants/star-appearance.constant';
import { GIANT_STRIDE, PATCH_STRIDE, STAR_STRIDE } from '../constants/star-lift.constant';
import { seededRandom } from '../utils/seeded-random.util';
import { twinkleAmplitudeForStrength } from '../utils/star-appearance.util';
import {
  depthGrowth,
  inflowFlux,
  isOutsideVolume,
  sampleDepth,
  sampleInflow,
} from '../utils/star-volume.util';
import { LiftedScene } from './lifted-scene.model';
import { FrameView, ScenePose, Vec3 } from './scene-pose.model';
import { Scene3dStyle, StarStyle } from './scene3d-settings.model';

/** Everything that decides how a star volume is built. Changing any of it means a rebuild. */
export interface StarVolumeConfig {
  /** Travel recycles stars forever; Arrive flies through a finite cloud. */
  style: Scene3dStyle;
  /** Original cut-outs or Sharp redrawn stars. */
  starStyle: StarStyle;
  /** Share of the photo's stars to show: 1 = all of them, 2 = twice as many. */
  starAmount: number;
  /** Spikes slider value (Sharp style only). */
  spikes: number;
  /** The resting lens. */
  view: FrameView;
  /** Far limit of the star volume, as a fraction of the backdrop distance. */
  far: number;
  /** Camera position on the first frame; stars are laid out as seen from here. */
  start: Vec3;
  /** Camera velocity, used to decide where recycled stars re-enter (Travel only). */
  velocity: Vec3;
  /** Seed for depths, clones and twinkle phases. */
  seed: number;
}

/** What changes from frame to frame. */
export interface StarVolumeFrame {
  /** Camera pose for this frame. */
  pose: ScenePose;
  /** Seconds since the shot (re)started. */
  seconds: number;
  /** Nebula relief, so giant stars ride on the backdrop surface. */
  relief: number;
  /** Star Size multiplier. */
  starSize: number;
  /** Twinkle slider value. */
  twinkle: number;
  /** Output height in px, to keep Sharp stars from going sub-pixel. */
  frameHeightPx: number;
}

/** One star as it enters the volume: where it is, how big, and how it looks. */
interface StarSeed {
  x: number;
  y: number;
  z: number;
  /** Angular half-size (world half-size per unit depth) at its home depth, per axis. */
  angX: number;
  angY: number;
  /** Depth the star's photo size belongs to. */
  home: number;
  /** Static render data: atlas rect, colour, amp, spike, extent. */
  rect: [number, number, number, number];
  color: [number, number, number];
  amp: number;
  spike: number;
  extent: number;
}

/**
 * @class StarVolume
 * @description
 * The moving stars of the 3D scene. Built once from a lifted scene, then stepped every frame.
 *
 * Every star starts exactly where the photo has it, on the line of sight from the starting
 * camera, at a depth chosen by brightness (brighter stars nearer). In Travel a star that leaves
 * the view volume re-enters upstream, and the space just outside the frame is filled from the
 * first frame so nothing arrives as a wave. In Arrive the cloud is finite: stars pass and are gone.
 *
 * Holds two flat buffers the renderer uploads as they are: a static one (looks) and a dynamic
 * one (position, size, opacity) rewritten by {@link step}.
 */
export class StarVolume {
  /** Number of star instances, including anchored giant-star spikes. */
  readonly count: number;
  /** `STAR_STATIC_STRIDE` floats per star; fixed for the life of the volume. */
  readonly staticData: Float32Array;
  /** `STAR_DYNAMIC_STRIDE` floats per star; rewritten each {@link step}. */
  readonly dynamicData: Float32Array;
  /** True when stars are drawn with the Sharp profile instead of photo cut-outs. */
  readonly sharp: boolean;

  private readonly movingCount: number;
  private readonly position: Float32Array;
  private readonly startPosition: Float32Array;
  private readonly angular: Float32Array;
  private readonly inverseHomeGrowth: Float32Array;
  private readonly twinklePhase: Float32Array;
  private readonly born: Float32Array;
  /** Giant stars: image-space u, v, depth-map value, angular half-size on the backdrop. */
  private readonly giants: Float32Array;
  private readonly near: number;
  private readonly flux: number[];
  private readonly random: () => number;

  constructor(
    private readonly scene: LiftedScene,
    private readonly config: StarVolumeConfig,
  ) {
    this.random = seededRandom(config.seed);
    this.sharp = config.starStyle === 'sharp';
    this.near = config.style === 'arrive' ? ARRIVE_VOLUME_NEAR : VOLUME_NEAR;
    this.flux = inflowFlux(config.velocity, config.view, this.near, config.far);

    const seeds = this.buildSeeds();
    const giantCount = this.sharp && config.spikes > 0 ? scene.giants.length / GIANT_STRIDE : 0;
    this.movingCount = seeds.length;
    this.count = seeds.length + giantCount;

    this.staticData = new Float32Array(this.count * STAR_STATIC_STRIDE);
    this.dynamicData = new Float32Array(this.count * STAR_DYNAMIC_STRIDE);
    this.position = new Float32Array(seeds.length * 3);
    this.angular = new Float32Array(seeds.length * 2);
    this.inverseHomeGrowth = new Float32Array(seeds.length);
    this.twinklePhase = new Float32Array(seeds.length);
    this.born = new Float32Array(seeds.length).fill(-Infinity);
    this.giants = new Float32Array(giantCount * 4);

    seeds.forEach((seed, i) => {
      this.position.set([seed.x, seed.y, seed.z], i * 3);
      this.angular.set([seed.angX, seed.angY], i * 2);
      this.inverseHomeGrowth[i] = 1 / depthGrowth(seed.home, config.far);
      this.twinklePhase[i] = this.random() * Math.PI * 2;
      this.staticData.set(
        [...seed.rect, ...seed.color, seed.amp, seed.spike, seed.extent, 0],
        i * STAR_STATIC_STRIDE,
      );
    });
    this.startPosition = new Float32Array(this.position);
    this.buildGiants(giantCount);
  }

  /** Puts every star back where the first frame has it, so the shot can replay. */
  reset(): void {
    this.position.set(this.startPosition);
    this.born.fill(-Infinity);
  }

  /**
   * Advances the stars to a frame: recycles the ones that left (Travel), then writes each
   * star's position, size and opacity into {@link dynamicData}.
   */
  step(frame: StarVolumeFrame): void {
    const { view, far, style } = this.config;
    const camera = frame.pose.position;
    const recycle = style === 'travel';
    const twinkleAmplitude = twinkleAmplitudeForStrength(frame.twinkle);
    // Output px per unit of angular size, for the Sharp sub-pixel guard.
    const pxPerAngle = frame.frameHeightPx / (2 * view.tanY * frame.pose.tanScale);
    const out = this.dynamicData;

    for (let i = 0; i < this.movingCount; i++) {
      const p = i * 3;
      let depth = camera.z - this.position[p + 2];
      if (recycle) {
        const x = this.position[p] - camera.x;
        const y = this.position[p + 1] - camera.y;
        if (isOutsideVolume(x, y, depth, view, this.near, far)) {
          const entry = sampleInflow(this.flux, view, this.near, far, this.random);
          this.position[p] = camera.x + entry.x;
          this.position[p + 1] = camera.y + entry.y;
          this.position[p + 2] = camera.z - entry.depth;
          this.born[i] = entry.fadeIn ? frame.seconds : -Infinity;
          depth = entry.depth;
        }
      }

      const o = i * STAR_DYNAMIC_STRIDE;
      out[o] = this.position[p];
      out[o + 1] = this.position[p + 1];
      out[o + 2] = this.position[p + 2];
      if (depth <= this.near * 0.5) {
        out[o + 3] = 0;
        out[o + 4] = 0;
        out[o + 5] = 0;
        continue;
      }

      let scale = depthGrowth(depth, far) * this.inverseHomeGrowth[i] * frame.starSize;
      let dim = 1;
      if (this.sharp) {
        // Never draw a star narrower than a fraction of a pixel: widen it and dim it instead,
        // which keeps its total light right and stops tiny stars flaring.
        const extent = this.staticData[i * STAR_STATIC_STRIDE + 9];
        const widthPx = (this.angular[i * 2] / extent) * scale * pxPerAngle;
        if (widthPx < SHARP_MIN_SCREEN_PX) {
          const widen = SHARP_MIN_SCREEN_PX / Math.max(widthPx, 1e-6);
          scale *= widen;
          dim = 1 / (widen * widen);
        }
      }
      out[o + 3] = this.angular[i * 2] * depth * scale;
      out[o + 4] = this.angular[i * 2 + 1] * depth * scale;

      const fadeIn = Math.min(1, Math.max(0, (frame.seconds - this.born[i]) / STAR_FADE_IN_SECONDS));
      const nearFade = Math.min(1, Math.max(0, (depth - this.near * 0.5) / this.near));
      const twinkle =
        twinkleAmplitude > 0
          ? Math.max(0, 1 + twinkleAmplitude * Math.sin(frame.seconds * TWINKLE_SPEED + this.twinklePhase[i]))
          : 1;
      out[o + 5] = dim * fadeIn * nearFade * twinkle * frame.pose.starFade;
    }

    this.stepGiants(frame.relief);
  }

  /** Lays out the moving stars: the photo's own, plus clones for density and for the margin. */
  private buildSeeds(): StarSeed[] {
    const { scene, config } = this;
    const { view, far, start, starAmount } = config;
    const patchCount = scene.patches.length / PATCH_STRIDE;
    const planeDistance = 1 + start.z;

    // Depth per cut-out: brighter cut-outs nearer, with some randomness.
    const order = Array.from({ length: patchCount }, (_, i) => i).sort(
      (a, b) => scene.patches[a * PATCH_STRIDE + 8] - scene.patches[b * PATCH_STRIDE + 8],
    );
    const patchDepth = new Float32Array(patchCount);
    const patchKept = new Uint8Array(patchCount);
    order.forEach((patch, rank) => {
      const brightness = patchCount > 1 ? rank / (patchCount - 1) : 0.5;
      const q = 1 - (DEPTH_RANK_WEIGHT * brightness + (1 - DEPTH_RANK_WEIGHT) * this.random());
      patchDepth[patch] = sampleDepth(Math.min(1, Math.max(0, q)), this.near, far);
      // Below 100 % Star Amount a random share of the photo's stars is left out.
      patchKept[patch] = this.random() < starAmount ? 1 : 0;
    });

    const inView = (px: number, py: number): boolean => {
      // Camera-space tangent of the backdrop point under this image position.
      const tx = ((px / scene.width - 0.5) * view.imageAspect - start.x) / planeDistance;
      const ty = (0.5 - py / scene.height - start.y) / planeDistance;
      return Math.abs(tx) <= VOLUME_MARGIN * view.tanX && Math.abs(ty) <= VOLUME_MARGIN * view.tanY;
    };
    const place = (px: number, py: number, depth: number): Vec3 => {
      // On the line of sight from the starting camera to the backdrop point, `depth` ahead.
      const planeX = (px / scene.width - 0.5) * view.imageAspect;
      const planeY = 0.5 - py / scene.height;
      const t = depth / planeDistance;
      return { x: start.x + (planeX - start.x) * t, y: start.y + (planeY - start.y) * t, z: start.z - depth };
    };

    // The looks available to clone from, and the photo's own stars.
    const looks: Omit<StarSeed, 'x' | 'y' | 'z'>[] = [];
    const seeds: StarSeed[] = [];
    const add = (px: number, py: number, patch: number, look: Omit<StarSeed, 'x' | 'y' | 'z'>): void => {
      looks.push(look);
      if (patchKept[patch] === 1 && inView(px, py)) {
        seeds.push({ ...place(px, py, patchDepth[patch]), ...look });
      }
    };

    if (this.sharp) {
      const starCount = scene.stars.length / STAR_STRIDE;
      const spikeOf = this.spikeStrengths(starCount);
      for (let s = 0; s < starCount; s++) {
        const o = s * STAR_STRIDE;
        const patch = scene.stars[o + 2];
        const extent = spikeOf[s] > 0 ? SPIKE_EXTENT_BASE + SPIKE_EXTENT_RANGE * spikeOf[s] : SHARP_EXTENT;
        const ang = (scene.stars[o + 4] * extent) / scene.height / planeDistance;
        add(scene.stars[o], scene.stars[o + 1], patch, {
          angX: ang,
          angY: ang,
          home: patchDepth[patch],
          rect: [0, 0, 0, 0],
          color: [scene.stars[o + 5], scene.stars[o + 6], scene.stars[o + 7]],
          amp: scene.stars[o + 3],
          spike: spikeOf[s],
          extent,
        });
      }
    } else {
      for (let patch = 0; patch < patchCount; patch++) {
        const o = patch * PATCH_STRIDE;
        const atlasW = scene.patches[o + 6];
        if (atlasW <= 0) continue; // did not fit the atlas
        const u0 = scene.patches[o + 4] / scene.atlasWidth;
        const v0 = scene.patches[o + 5] / scene.atlasHeight;
        add(scene.patches[o], scene.patches[o + 1], patch, {
          angX: scene.patches[o + 2] / scene.height / planeDistance,
          angY: scene.patches[o + 3] / scene.height / planeDistance,
          home: patchDepth[patch],
          rect: [u0, v0, u0 + atlasW / scene.atlasWidth, v0 + scene.patches[o + 7] / scene.atlasHeight],
          color: [1, 1, 1],
          amp: 1,
          spike: 0,
          extent: 1,
        });
      }
    }
    if (looks.length === 0) return seeds;

    // Clones: extra stars inside the frame above 100 %, and (Travel) the ring just outside the
    // frame so stars are already waiting upstream on the first frame.
    // Photo stars inside the view, before any were left out by a Star Amount below 100 %.
    const inFrame = seeds.length / Math.max(Math.min(1, starAmount), 1e-6);
    const extraInside = Math.round(Math.max(0, starAmount - 1) * inFrame);
    const ring = config.style === 'travel' ? Math.round(inFrame * starAmount * (VOLUME_MARGIN ** 2 - 1)) : 0;
    const clone = (u: number, v: number): void => {
      const depth = sampleDepth(this.random(), this.near, far);
      const look = looks[Math.floor(this.random() * looks.length)];
      seeds.push({
        x: start.x + u * view.tanX * depth,
        y: start.y + v * view.tanY * depth,
        z: start.z - depth,
        ...look,
      });
    };
    for (let i = 0; i < extraInside; i++) {
      clone(this.random() * 2 - 1, this.random() * 2 - 1);
    }
    const halfPlaneX = view.imageAspect / 2;
    for (let i = 0; i < ring; i++) {
      let u = 0;
      let v = 0;
      do {
        u = (this.random() * 2 - 1) * VOLUME_MARGIN;
        v = (this.random() * 2 - 1) * VOLUME_MARGIN;
      } while (Math.abs(u) <= 1 && Math.abs(v) <= 1);
      // Where the photo itself reaches into the margin its own stars already fill it.
      const planeX = start.x + u * view.tanX * planeDistance;
      const planeY = start.y + v * view.tanY * planeDistance;
      if (Math.abs(planeX) <= halfPlaneX && Math.abs(planeY) <= 0.5) continue;
      clone(u, v);
    }
    return seeds;
  }

  /** Spike strength per measured star: the brightest share get spikes, scaled by rank. */
  private spikeStrengths(starCount: number): Float32Array {
    const strengths = new Float32Array(starCount);
    const share = SPIKE_FRACTION_PER_UNIT * this.config.spikes;
    if (share <= 0 || starCount === 0) return strengths;
    const power = (s: number): number =>
      this.scene.stars[s * STAR_STRIDE + 3] * this.scene.stars[s * STAR_STRIDE + 4];
    const sorted = Array.from({ length: starCount }, (_, s) => power(s)).sort((a, b) => a - b);
    const threshold = sorted[Math.min(starCount - 1, Math.floor(starCount * (1 - share)))];
    const top = sorted[starCount - 1];
    for (let s = 0; s < starCount; s++) {
      const p = power(s);
      if (p > threshold) {
        const rank = top > threshold ? (p - threshold) / (top - threshold) : 1;
        strengths[s] = SPIKE_MIN_STRENGTH + (1 - SPIKE_MIN_STRENGTH) * Math.min(1, rank);
      }
    }
    return strengths;
  }

  /** Records each giant star's place on the backdrop and its fixed looks. */
  private buildGiants(giantCount: number): void {
    const { scene } = this;
    for (let g = 0; g < giantCount; g++) {
      const o = g * GIANT_STRIDE;
      const x = scene.giants[o];
      const y = scene.giants[o + 1];
      const depthIndex =
        Math.min(scene.height - 1, Math.max(0, Math.round(y))) * scene.width +
        Math.min(scene.width - 1, Math.max(0, Math.round(x)));
      const width = Math.max(GIANT_SPIKE_MIN_WIDTH, scene.giants[o + 2] * GIANT_SPIKE_WIDTH_FACTOR);
      this.giants.set(
        [x / scene.width, y / scene.height, scene.cloudDepth[depthIndex] / 255, (width * GIANT_SPIKE_EXTENT) / scene.height],
        g * 4,
      );
      this.staticData.set(
        [0, 0, 0, 0, scene.giants[o + 3], scene.giants[o + 4], scene.giants[o + 5], GIANT_SPIKE_AMP, 1, GIANT_SPIKE_EXTENT, 1],
        (this.movingCount + g) * STAR_STATIC_STRIDE,
      );
    }
  }

  /** Giant-star spikes ride on the backdrop surface, so they follow the nebula relief. */
  private stepGiants(relief: number): void {
    const aspect = this.config.view.imageAspect;
    for (let g = 0; g < this.giants.length / 4; g++) {
      const u = this.giants[g * 4];
      const v = this.giants[g * 4 + 1];
      // Just in front of the surface so the spike is never hidden by it.
      const surface = (1 - relief * this.giants[g * 4 + 2]) * 0.9995;
      const o = (this.movingCount + g) * STAR_DYNAMIC_STRIDE;
      this.dynamicData[o] = (u - 0.5) * aspect * surface;
      this.dynamicData[o + 1] = (0.5 - v) * surface;
      this.dynamicData[o + 2] = -surface;
      this.dynamicData[o + 3] = this.giants[g * 4 + 3] * surface;
      this.dynamicData[o + 4] = this.giants[g * 4 + 3] * surface;
      this.dynamicData[o + 5] = 1;
    }
  }
}
