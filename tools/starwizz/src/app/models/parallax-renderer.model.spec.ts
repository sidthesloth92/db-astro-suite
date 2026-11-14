import { makePhoto } from '../../testing/synthetic-photo.util';
import { frameView } from '../utils/camera-path.util';
import { liftStars } from '../utils/star-lift.util';
import { LiftedScene } from './lifted-scene.model';
import { ParallaxRenderer } from './parallax-renderer.model';
import { ScenePose } from './scene-pose.model';
import { StarVolume } from './star-volume.model';

const W = 180;
const H = 320;
const STARS = [
  { x: 50, y: 70, amp: 0.6, sigma: 1.8 },
  { x: 130, y: 120, amp: 0.85, sigma: 2.2, color: [1, 0.7, 0.4] as [number, number, number] },
  { x: 90, y: 230, amp: 0.4, sigma: 1.5 },
];
const REST: ScenePose = { position: { x: 0, y: 0, z: 0 }, roll: 0, tanScale: 1, starFade: 1, photoMix: 0 };

/** Reads the canvas back as RGBA with row 0 at the top, like the photo. */
function readTopDown(canvas: HTMLCanvasElement): Uint8Array {
  // Justification for the non-null assertion: the renderer already created this context.
  const gl = canvas.getContext('webgl2')!;
  const raw = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  const out = new Uint8Array(raw.length);
  for (let y = 0; y < H; y++) out.set(raw.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  return out;
}

/** Mean and worst per-channel difference between a rendered frame and the photo. */
function difference(rendered: Uint8Array, photo: Uint8ClampedArray): { mean: number; worst: number } {
  let sum = 0;
  let worst = 0;
  for (let i = 0; i < photo.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(rendered[i + c] - photo[i + c]);
      sum += d;
      if (d > worst) worst = d;
    }
  }
  return { mean: sum / ((photo.length / 4) * 3), worst };
}

describe('ParallaxRenderer', () => {
  let canvas: HTMLCanvasElement;
  let scene: LiftedScene;
  const view = frameView(W / H, W / H, 1);

  beforeEach(() => {
    if (!ParallaxRenderer.isSupported()) {
      pending('WebGL2 is not available in this browser');
    }
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    scene = liftStars(makePhoto(W, H, [0.06, 0.08, 0.12], STARS), W, H);
  });

  function volume(starStyle: 'original' | 'sharp'): StarVolume {
    const stars = new StarVolume(scene, {
      style: 'arrive',
      starStyle,
      starAmount: 1,
      spikes: 0,
      view,
      far: 0.38,
      start: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -0.05 },
      returnStars: false,
      seed: 11,
    });
    stars.step({ pose: REST, seconds: 0, relief: 0, starSize: 1, twinkle: 0, frameHeightPx: H });
    return stars;
  }

  it('should rebuild the photo on the first frame from the starless backdrop and the lifted stars', () => {
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    renderer.setStars(volume('original'));
    renderer.render({ pose: REST, view, relief: 0 });

    const { mean, worst } = difference(readTopDown(canvas), scene.photo);
    expect(mean).toBeLessThan(0.6);
    expect(worst).toBeLessThan(40);
    renderer.dispose();
  });

  it('should show only the starless backdrop when no stars are set', () => {
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    renderer.render({ pose: REST, view, relief: 0 });

    expect(difference(readTopDown(canvas), scene.starless).mean).toBeLessThan(0.6);
    renderer.dispose();
  });

  it('should keep the first frame undistorted whatever the cloud depth', () => {
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    renderer.render({ pose: REST, view, relief: 0.4 });

    expect(difference(readTopDown(canvas), scene.starless).mean).toBeLessThan(0.8);
    renderer.dispose();
  });

  it('should give its graphics context back when disposed', () => {
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    renderer.dispose();
    // Justification for the non-null assertion: the renderer already created this context.
    expect(canvas.getContext('webgl2')!.isContextLost()).toBeTrue();
  });

  it('should bring the original photo back as the stars return', () => {
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    renderer.render({ pose: { ...REST, photoMix: 1 }, view, relief: 0 });

    expect(difference(readTopDown(canvas), scene.photo).mean).toBeLessThan(0.6);
    renderer.dispose();
  });

  it('should draw Sharp stars as bright as the photo’s stars, in the same places', () => {
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    renderer.setStars(volume('sharp'));
    renderer.render({ pose: REST, view, relief: 0 });

    const rendered = readTopDown(canvas);
    for (const star of STARS) {
      const i = (star.y * W + star.x) * 4;
      const drawn = Math.max(rendered[i], rendered[i + 1], rendered[i + 2]);
      const original = Math.max(scene.photo[i], scene.photo[i + 1], scene.photo[i + 2]);
      expect(Math.abs(drawn - original)).withContext(`star at ${star.x},${star.y}`).toBeLessThan(45);
    }
    renderer.dispose();
  });

  it('should move a near star across the frame further than the backdrop when the camera slides', () => {
    /** Column of the brightest pixel on a star's row, searched around where it started. */
    const peakColumn = (rendered: Uint8Array, x0: number, y: number): number => {
      let best = x0;
      let brightest = -1;
      for (let x = Math.max(0, x0 - 70); x <= Math.min(W - 1, x0 + 70); x++) {
        const value = rendered[(y * W + x) * 4];
        if (value > brightest) {
          brightest = value;
          best = x;
        }
      }
      return best;
    };
    const renderer = new ParallaxRenderer(canvas);
    renderer.setScene(scene);
    const stars = volume('original');
    renderer.setStars(stars);
    const slide = 0.01;
    const slid: ScenePose = { ...REST, position: { x: slide, y: 0, z: 0 } };
    stars.step({ pose: slid, seconds: 0, relief: 0, starSize: 1, twinkle: 0, frameHeightPx: H });
    renderer.render({ pose: slid, view, relief: 0 });
    const rendered = readTopDown(canvas);

    // The backdrop is one unit away, so it shifts by this many pixels, to the left.
    const backdropShift = (slide / (2 * view.tanX)) * W;
    for (const star of STARS) {
      const moved = star.x - peakColumn(rendered, star.x, star.y);
      // Every star is nearer than the backdrop: it moves the same way, and clearly further.
      expect(moved).withContext(`star at ${star.x},${star.y}`).toBeGreaterThan(backdropShift * 1.5);
    }
    renderer.dispose();
  });
});
