import { STAR_DYNAMIC_STRIDE, STAR_STATIC_STRIDE, VOLUME_MARGIN } from '../constants/scene3d.constant';
import { makePhoto } from '../../testing/synthetic-photo.util';
import { coverFor, frameView } from '../utils/camera-path.util';
import { liftStars } from '../utils/star-lift.util';
import { LiftedScene } from './lifted-scene.model';
import { ScenePose } from './scene-pose.model';
import { StarVolume, StarVolumeConfig, StarVolumeFrame } from './star-volume.model';

const W = 270;
const H = 480;
const STARS = [
  { x: 60, y: 90, amp: 0.6, sigma: 1.8 },
  { x: 200, y: 140, amp: 0.85, sigma: 2.2 },
  { x: 130, y: 300, amp: 0.4, sigma: 1.5 },
  { x: 80, y: 400, amp: 0.5, sigma: 1.6 },
  { x: 220, y: 380, amp: 0.7, sigma: 2 },
];
const VIEW = frameView(W / H, 9 / 16, 1);
const FAR = 0.625;

const config = (patch: Partial<StarVolumeConfig> = {}): StarVolumeConfig => ({
  style: 'travel',
  starStyle: 'original',
  starAmount: 1,
  spikes: 5,
  view: VIEW,
  far: FAR,
  start: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: -0.02 },
  returnStars: false,
  seed: 11,
  ...patch,
});
const pose = (patch: Partial<ScenePose> = {}): ScenePose => ({
  position: { x: 0, y: 0, z: 0 },
  roll: 0,
  tanScale: 1,
  starFade: 1,
  photoMix: 0,
  ...patch,
});
const frame = (patch: Partial<StarVolumeFrame> = {}): StarVolumeFrame => ({
  pose: pose(),
  seconds: 0,
  relief: 0,
  starSize: 1,
  twinkle: 0,
  frameHeightPx: 1920,
  ...patch,
});

/** Screen position of star `i`, as tangents from the frame centre (x right, y up). */
function screenOf(volume: StarVolume, i: number, camera = { x: 0, y: 0, z: 0 }): { x: number; y: number } {
  const o = i * STAR_DYNAMIC_STRIDE;
  const depth = camera.z - volume.dynamicData[o + 2];
  return { x: (volume.dynamicData[o] - camera.x) / depth, y: (volume.dynamicData[o + 1] - camera.y) / depth };
}

describe('StarVolume', () => {
  let scene: LiftedScene;

  beforeAll(() => {
    scene = liftStars(makePhoto(W, H, [0.05, 0.05, 0.06], STARS), W, H);
  });

  it('should start every photo star exactly where the photo has it', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive' }));
    volume.step(frame());

    expect(volume.count).toBe(STARS.length);
    const seen = Array.from({ length: volume.count }, (_, i) => screenOf(volume, i));
    for (const star of STARS) {
      // The photo is one unit tall and W/H wide, one unit away.
      const expected = { x: ((star.x + 0.5) / W - 0.5) * (W / H), y: 0.5 - (star.y + 0.5) / H };
      const hit = seen.some((s) => Math.abs(s.x - expected.x) < 0.004 && Math.abs(s.y - expected.y) < 0.004);
      expect(hit).withContext(`star at ${star.x},${star.y}`).toBeTrue();
    }
  });

  it('should show each star at its photo size, fully visible, on the first frame', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive' }));
    volume.step(frame());
    for (let i = 0; i < volume.count; i++) {
      const o = i * STAR_DYNAMIC_STRIDE;
      const depth = -volume.dynamicData[o + 2];
      const angular = volume.dynamicData[o + 3] / depth;
      // A cut-out is a few to a few dozen px wide on a 480 px tall photo.
      expect(angular * H).toBeGreaterThan(2);
      expect(angular * H).toBeLessThan(40);
      expect(volume.dynamicData[o + 5]).toBe(1);
    }
  });

  it('should place the biggest, brightest star nearer than the smallest', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive' }));
    volume.step(frame());
    const depths = Array.from({ length: volume.count }, (_, i) => -volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 2]);
    const sizes = Array.from({ length: volume.count }, (_, i) => volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 3] / depths[i]);
    const biggest = sizes.indexOf(Math.max(...sizes));
    const smallest = sizes.indexOf(Math.min(...sizes));
    expect(depths[biggest]).toBeLessThan(depths[smallest]);
  });

  it('should fill the space just outside the frame from the first frame when travelling', () => {
    const volume = new StarVolume(scene, config({ starAmount: 3 }));
    volume.step(frame());
    expect(volume.count).toBeGreaterThan(STARS.length);
    let outsideFrame = 0;
    for (let i = 0; i < volume.count; i++) {
      const s = screenOf(volume, i);
      if (Math.abs(s.x) > VIEW.tanX || Math.abs(s.y) > VIEW.tanY) outsideFrame++;
      expect(Math.abs(s.x)).toBeLessThanOrEqual(VOLUME_MARGIN * VIEW.tanX + 1e-6);
    }
    expect(outsideFrame).toBeGreaterThan(0);
  });

  it('should keep its stars in front of the camera however far a Travel shot flies', () => {
    const volume = new StarVolume(scene, config({ starAmount: 3 }));
    for (let t = 0; t <= 40; t += 0.5) {
      volume.step(frame({ pose: pose({ position: { x: 0, y: 0, z: -0.02 * t } }), seconds: t }));
    }
    let visible = 0;
    for (let i = 0; i < volume.count; i++) {
      const depth = -0.8 - volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 2];
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeLessThanOrEqual(FAR + 1e-6);
      expect(volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 2]).toBeGreaterThan(-1);
      if (volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 5] > 0) visible++;
    }
    expect(visible).toBeGreaterThan(volume.count * 0.8);
  });

  it('should never recycle a star to behind the backdrop, however close the camera gets', () => {
    const volume = new StarVolume(scene, config({ starAmount: 3 }));
    // Fly to within a quarter of the backdrop distance: further than the star volume is deep.
    for (let t = 0; t <= 37.5; t += 0.5) {
      volume.step(frame({ pose: pose({ position: { x: 0, y: 0, z: -0.02 * t } }), seconds: t }));
    }
    for (let i = 0; i < volume.count; i++) {
      expect(volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 2]).toBeGreaterThan(-1);
    }
  });

  it('should replay a shot identically after a reset', () => {
    const volume = new StarVolume(scene, config({ starAmount: 3 }));
    const run = (): number[] => {
      for (let t = 0; t <= 30; t += 0.5) {
        volume.step(frame({ pose: pose({ position: { x: 0, y: 0, z: -0.02 * t } }), seconds: t }));
      }
      return Array.from(volume.dynamicData);
    };
    const first = run();
    volume.reset();
    const second = run();
    volume.reset();
    expect(second).toEqual(first);
    expect(run()).toEqual(first);
  });

  it('should fade in a star that re-enters inside the frame instead of popping', () => {
    const volume = new StarVolume(scene, config({ far: 0.3 }));
    volume.step(frame());
    // Jump past the whole volume in one step (still short of the backdrop): every star is
    // behind the camera and re-enters at the far cap.
    volume.step(frame({ pose: pose({ position: { x: 0, y: 0, z: -0.4 } }), seconds: 10 }));
    for (let i = 0; i < volume.count; i++) {
      expect(volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 5]).toBe(0);
    }
    volume.step(frame({ pose: pose({ position: { x: 0, y: 0, z: -0.4 } }), seconds: 12 }));
    expect(volume.dynamicData[5]).toBe(1);
  });

  it('should let Arrive stars pass and vanish without recycling', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive', far: 0.38 }));
    volume.step(frame({ pose: pose({ position: { x: 0, y: 0, z: -0.5 } }), seconds: 5 }));
    for (let i = 0; i < volume.count; i++) {
      expect(volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 5]).toBe(0);
    }
  });

  it('should hide the stars as Arrive clears them before settling', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive' }));
    volume.step(frame({ pose: pose({ starFade: 0 }) }));
    for (let i = 0; i < volume.count; i++) {
      expect(volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 5]).toBe(0);
    }
  });

  it('should scale every star with Star Size', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive' }));
    volume.step(frame());
    const before = volume.dynamicData[3];
    volume.step(frame({ starSize: 2 }));
    expect(volume.dynamicData[3]).toBeCloseTo(before * 2, 6);
  });

  it('should add stars above 100 percent and remove some below it', () => {
    const base = new StarVolume(scene, config({ style: 'arrive' })).count;
    expect(new StarVolume(scene, config({ style: 'arrive', starAmount: 3 })).count).toBe(base * 3);
    expect(new StarVolume(scene, config({ style: 'arrive', starAmount: 0.2, seed: 4 })).count).toBeLessThan(base);
  });

  it('should make the stars shimmer only when Twinkle is on', () => {
    const volume = new StarVolume(scene, config({ style: 'arrive' }));
    volume.step(frame({ seconds: 1 }));
    expect(volume.dynamicData[5]).toBe(1);
    volume.step(frame({ seconds: 1, twinkle: 10 }));
    const alphas = Array.from({ length: volume.count }, (_, i) => volume.dynamicData[i * STAR_DYNAMIC_STRIDE + 5]);
    expect(new Set(alphas.map((a) => a.toFixed(3))).size).toBeGreaterThan(1);
  });

  it('should return to the first frame on reset', () => {
    const volume = new StarVolume(scene, config());
    volume.step(frame());
    const first = Array.from(volume.dynamicData);
    volume.step(frame({ pose: pose({ position: { x: 0.1, y: 0, z: -0.4 } }), seconds: 8 }));
    volume.reset();
    volume.step(frame());
    expect(Array.from(volume.dynamicData)).toEqual(first);
  });

  describe('Sharp style', () => {
    it('should draw one redrawn star per measured star, in its own colour', () => {
      const volume = new StarVolume(scene, config({ style: 'arrive', starStyle: 'sharp', spikes: 0 }));
      expect(volume.sharp).toBeTrue();
      expect(volume.count).toBe(STARS.length);
      for (let i = 0; i < volume.count; i++) {
        const s = i * STAR_STATIC_STRIDE;
        expect(Math.max(volume.staticData[s + 4], volume.staticData[s + 5], volume.staticData[s + 6])).toBeCloseTo(1, 5);
        expect(volume.staticData[s + 7]).toBeGreaterThan(0); // amp
        expect(volume.staticData[s + 8]).toBe(0); // no spikes at 0
      }
    });

    it('should never draw a star narrower than a fraction of a pixel, dimming it instead', () => {
      const volume = new StarVolume(scene, config({ style: 'arrive', starStyle: 'sharp', spikes: 0 }));
      volume.step(frame({ frameHeightPx: 1920 }));
      const sharpAlpha = volume.dynamicData[5];
      volume.step(frame({ frameHeightPx: 40 })); // a tiny output makes every star sub-pixel
      expect(volume.dynamicData[5]).toBeLessThan(sharpAlpha);
    });

    it('should bring sharp stars back at the end of Arrive, pinned where the photo has them', () => {
      const moving = new StarVolume(scene, config({ style: 'arrive', starStyle: 'sharp', spikes: 0 }));
      const volume = new StarVolume(
        scene,
        config({ style: 'arrive', starStyle: 'sharp', spikes: 0, returnStars: true }),
      );
      expect(moving.drawsReturningStars).toBeFalse();
      expect(volume.drawsReturningStars).toBeTrue();
      expect(volume.count).toBe(moving.count + STARS.length);

      // While flying they are hidden.
      volume.step(frame({ pose: pose({ photoMix: 0 }) }));
      const returning = Array.from({ length: STARS.length }, (_, k) => (moving.count + k) * STAR_DYNAMIC_STRIDE);
      for (const o of returning) expect(volume.dynamicData[o + 5]).toBe(0);

      // Once the camera has settled they fade in, on the backdrop, at the photo's positions.
      volume.step(frame({ pose: pose({ photoMix: 1, starFade: 0 }) }));
      for (const o of returning) {
        expect(volume.dynamicData[o + 5]).toBeGreaterThan(0);
        expect(volume.dynamicData[o + 2]).toBeCloseTo(-1, 2);
      }
      const seen = returning.map((o) => ({ x: -volume.dynamicData[o] / volume.dynamicData[o + 2], y: -volume.dynamicData[o + 1] / volume.dynamicData[o + 2] }));
      for (const star of STARS) {
        const expected = { x: ((star.x + 0.5) / W - 0.5) * (W / H), y: 0.5 - (star.y + 0.5) / H };
        expect(seen.some((s) => Math.abs(s.x - expected.x) < 0.004 && Math.abs(s.y - expected.y) < 0.004))
          .withContext(`star at ${star.x},${star.y}`)
          .toBeTrue();
      }
    });

    it('should leave the returning stars to the backdrop in the Original style and in Travel', () => {
      expect(new StarVolume(scene, config({ style: 'arrive', returnStars: true })).drawsReturningStars).toBeFalse();
      expect(
        new StarVolume(scene, config({ style: 'travel', starStyle: 'sharp', returnStars: true })).drawsReturningStars,
      ).toBeFalse();
    });

    it('should anchor a giant star’s spike to the backdrop and let it ride the cloud depth', () => {
      const giantScene = liftStars(
        makePhoto(W, H, [0.05, 0.08, 0.15], [...STARS, { x: 135, y: 240, amp: 6, sigma: 6 }]),
        W,
        H,
      );
      const volume = new StarVolume(giantScene, config({ style: 'arrive', starStyle: 'sharp', spikes: 5 }));
      const last = (volume.count - 1) * STAR_DYNAMIC_STRIDE;
      expect(volume.staticData[(volume.count - 1) * STAR_STATIC_STRIDE + 10]).toBe(1); // spike-only kind

      volume.step(frame({ relief: 0 }));
      const flatDepth = -volume.dynamicData[last + 2];
      volume.step(frame({ relief: 0.4, pose: pose({ starFade: 0 }) }));
      expect(-volume.dynamicData[last + 2]).toBeLessThan(flatDepth); // nearer with relief
      expect(volume.dynamicData[last + 5]).toBe(1); // not cleared with the moving stars
    });
  });

  describe('when the view turns', () => {
    /** The box a frame turning all the way round stays inside. */
    const COVER = coverFor(VIEW, Math.PI);

    it('should lay the stars out exactly as before when the box is the lens itself', () => {
      const plain = new StarVolume(scene, config({ starAmount: 3 }));
      const same = new StarVolume(scene, config({ starAmount: 3, cover: VIEW }));
      plain.step(frame());
      same.step(frame());
      expect(same.count).toBe(plain.count);
      expect(Array.from(same.dynamicData)).toEqual(Array.from(plain.dynamicData));
    });

    it('should fill the whole box the turning frame stays inside from the first frame', () => {
      const plain = new StarVolume(scene, config({ starAmount: 3 }));
      const volume = new StarVolume(scene, config({ starAmount: 3, cover: COVER }));
      volume.step(frame());
      expect(volume.count).toBeGreaterThan(plain.count);

      // Stars wait in every corner of the box, beyond the lens's own margin, and none lie outside it.
      const corners = { topRight: 0, topLeft: 0, bottomRight: 0, bottomLeft: 0 };
      for (let i = 0; i < volume.count; i++) {
        const s = screenOf(volume, i);
        expect(Math.abs(s.x)).toBeLessThanOrEqual(VOLUME_MARGIN * COVER.tanX + 1e-6);
        expect(Math.abs(s.y)).toBeLessThanOrEqual(VOLUME_MARGIN * COVER.tanY + 1e-6);
        if (Math.abs(s.x) <= VOLUME_MARGIN * VIEW.tanX) continue;
        if (s.x > 0 && s.y > 0) corners.topRight++;
        if (s.x < 0 && s.y > 0) corners.topLeft++;
        if (s.x > 0 && s.y < 0) corners.bottomRight++;
        if (s.x < 0 && s.y < 0) corners.bottomLeft++;
      }
      expect(Object.values(corners).every((count) => count > 0)).withContext(JSON.stringify(corners)).toBeTrue();
    });

    it('should spread the extra stars about as thickly outside the frame as inside it', () => {
      const volume = new StarVolume(scene, config({ starAmount: 3, cover: COVER }));
      volume.step(frame());
      let inFrame = 0;
      let beyond = 0;
      for (let i = 0; i < volume.count; i++) {
        const s = screenOf(volume, i);
        if (Math.abs(s.x) <= VIEW.tanX && Math.abs(s.y) <= VIEW.tanY) inFrame++;
        else if (Math.abs(s.x) > VOLUME_MARGIN * VIEW.tanX || Math.abs(s.y) > VOLUME_MARGIN * VIEW.tanY) beyond++;
      }
      const frameArea = 4 * VIEW.tanX * VIEW.tanY;
      const beyondArea = VOLUME_MARGIN ** 2 * (4 * COVER.tanX * COVER.tanY - frameArea);
      const ratio = beyond / beyondArea / (inFrame / frameArea);
      expect(ratio).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(1.6);
    });

    it('should keep recycled stars inside that box however long a Travel shot flies', () => {
      const volume = new StarVolume(scene, config({ starAmount: 3, cover: COVER }));
      let camera = { x: 0, y: 0, z: 0 };
      for (let t = 0; t <= 20; t += 0.5) {
        camera = { x: 0, y: 0, z: -0.02 * t };
        volume.step(frame({ pose: pose({ position: camera, roll: 0.1 * t }), seconds: t }));
      }
      let beyondLens = 0;
      for (let i = 0; i < volume.count; i++) {
        const s = screenOf(volume, i, camera);
        expect(Math.abs(s.x)).toBeLessThanOrEqual(VOLUME_MARGIN * COVER.tanX + 1e-6);
        expect(Math.abs(s.y)).toBeLessThanOrEqual(VOLUME_MARGIN * COVER.tanY + 1e-6);
        if (Math.abs(s.x) > VOLUME_MARGIN * VIEW.tanX) beyondLens++;
      }
      expect(beyondLens).toBeGreaterThan(0);
    });

    it('should not invent stars past the photo’s edge for Arrive, whose cloud is the photo’s own', () => {
      const plain = new StarVolume(scene, config({ style: 'arrive' }));
      const volume = new StarVolume(scene, config({ style: 'arrive', cover: COVER }));
      volume.step(frame());
      // The photo exactly fills this lens, so there is nothing of it beyond the lens to show.
      expect(volume.count).toBe(plain.count);
    });
  });
});
