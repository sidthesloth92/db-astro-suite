import {
  ARRIVE_REACH_HOLD,
  ARRIVE_REACH_ZOOM,
  LATERAL_OVERSCAN,
  SCENE3D_CONTROLS,
  TRAVEL_MAX_ZOOM,
} from '../constants/scene3d.constant';
import { FrameView, TravelPlan } from '../models/scene-pose.model';
import { Scene3dSettings } from '../models/scene3d-settings.model';
import {
  arrivePose,
  frameView,
  overscanFor,
  planArrive,
  planTravel,
  reliefFor,
  smoothStep,
  starFarDepth,
  travelPose,
  travelVelocity,
} from './camera-path.util';

const BASE: Scene3dSettings = {
  style: 'travel',
  direction: 'forward',
  aim: { x: 0, y: 0 },
  starStyle: 'original',
  zoomIn: true,
  starsReturn: true,
  speed: SCENE3D_CONTROLS.speed.initial,
  cloudDepth: SCENE3D_CONTROLS.cloudDepth.initial,
  starAmount: 100,
  starSize: 1,
  starDepth: SCENE3D_CONTROLS.starDepth.initial,
  spikes: 5,
  twinkle: 0,
};
const settings = (patch: Partial<Scene3dSettings>): Scene3dSettings => ({ ...BASE, ...patch });

/** True when the frame never shows past the edge of the photo at any point of a plan. */
function staysInsidePhoto(plan: TravelPlan, view: FrameView): boolean {
  for (let u = 0; u <= 1.0001; u += 0.05) {
    const { position } = travelPose(plan, u);
    const reach = 1 + position.z; // distance to the backdrop
    const edgeX = Math.abs(position.x) + view.tanX * reach;
    const edgeY = Math.abs(position.y) + view.tanY * reach;
    if (edgeX > view.imageAspect / 2 + 1e-6 || edgeY > 0.5 + 1e-6) return false;
  }
  return true;
}

describe('camera path util', () => {
  describe('frameView', () => {
    it('should fit the photo’s height when the photo is wider than the frame', () => {
      const view = frameView(16 / 9, 9 / 16, 1);
      expect(view.tanY).toBeCloseTo(0.5, 6);
      expect(view.tanX).toBeCloseTo(0.5 * (9 / 16), 6);
    });

    it('should fit the photo’s width when the photo is narrower than the frame', () => {
      const view = frameView(0.5, 2, 1);
      expect(view.tanX).toBeCloseTo(0.25, 6);
    });

    it('should show less of the photo when zoomed in by an overscan', () => {
      expect(frameView(1, 1, 1.3).tanY).toBeCloseTo(0.5 / 1.3, 6);
    });
  });

  describe('overscanFor', () => {
    it('should leave room to slide only for sideways travel', () => {
      expect(overscanFor(settings({ direction: 'forward' }))).toBe(1);
      expect(overscanFor(settings({ direction: 'custom' }))).toBe(1);
      expect(overscanFor(settings({ direction: 'left' }))).toBe(LATERAL_OVERSCAN);
      expect(overscanFor(settings({ style: 'arrive', direction: 'left' }))).toBe(1);
    });
  });

  it('should bring the stars closer as Star Depth rises', () => {
    expect(starFarDepth(8)).toBeLessThan(starFarDepth(2));
    expect(starFarDepth(2)).toBeLessThan(1);
  });

  it('should give no relief at Cloud Depth zero', () => {
    expect(reliefFor(0)).toBe(0);
    expect(reliefFor(6)).toBeGreaterThan(0);
  });

  describe('planTravel', () => {
    const view = frameView(9 / 16, 9 / 16, 1);

    it('should fly straight in and stop at the zoom limit', () => {
      const plan = planTravel(settings({ direction: 'forward' }), view, 0.6);
      expect(plan.start).toEqual({ x: 0, y: 0, z: 0 });
      expect(1 / (1 + plan.end.z)).toBeCloseTo(TRAVEL_MAX_ZOOM, 6);
      expect(plan.end.x).toBe(0);
    });

    it('should take half as long at twice the speed', () => {
      const slow = planTravel(settings({ speed: 2 }), view, 0.6);
      const fast = planTravel(settings({ speed: 4 }), view, 0.6);
      expect(fast.duration).toBeCloseTo(slow.duration / 2, 6);
    });

    it('should head toward the chosen point when the direction is custom', () => {
      const plan = planTravel(settings({ direction: 'custom', aim: { x: 0.3, y: -0.2 } }), view, 0.6);
      expect(plan.end.x).toBeGreaterThan(0); // aim right of centre
      expect(plan.end.y).toBeGreaterThan(0); // aim above centre (y down on screen, up in the scene)
      expect(staysInsidePhoto(plan, view)).toBeTrue();
    });

    it('should clamp a custom aim to the frame so the photo’s edge is never exposed', () => {
      const plan = planTravel(settings({ direction: 'custom', aim: { x: 5, y: 5 } }), view, 0.6);
      expect(staysInsidePhoto(plan, view)).toBeTrue();
    });

    it('should start close and pull back to the full photo when travelling backward', () => {
      const plan = planTravel(settings({ direction: 'backward' }), view, 0.6);
      expect(plan.start.z).toBeLessThan(0);
      expect(plan.end).toEqual({ x: 0, y: 0, z: 0 });
      expect(-plan.start.z).toBeLessThanOrEqual(1 - 0.6);
    });

    for (const direction of ['left', 'right', 'up', 'down'] as const) {
      it(`should slide the scene ${direction} without ever showing past the photo’s edge`, () => {
        const s = settings({ direction });
        const lateralView = frameView(9 / 16, 9 / 16, overscanFor(s));
        const plan = planTravel(s, lateralView, 0.6);
        const velocity = travelVelocity(plan);

        expect(staysInsidePhoto(plan, lateralView)).toBeTrue();
        // The scene drifts the named way, so the camera goes the other way.
        if (direction === 'left') expect(velocity.x).toBeGreaterThan(0);
        if (direction === 'right') expect(velocity.x).toBeLessThan(0);
        if (direction === 'up') expect(velocity.y).toBeLessThan(0);
        if (direction === 'down') expect(velocity.y).toBeGreaterThan(0);
        expect(velocity.z).toBeLessThan(0); // sideways shots also ease forward
      });
    }

    it('should use the spare width of a wide photo for a longer sideways shot', () => {
      const s = settings({ direction: 'left' });
      const narrow = planTravel(s, frameView(9 / 16, 9 / 16, overscanFor(s)), 0.6);
      const wide = planTravel(s, frameView(16 / 9, 9 / 16, overscanFor(s)), 0.6);
      expect(wide.duration).toBeGreaterThan(narrow.duration);
    });
  });

  describe('travelPose', () => {
    it('should move at constant speed from start to end', () => {
      const plan: TravelPlan = { start: { x: -1, y: 0, z: 0 }, end: { x: 1, y: 2, z: -0.4 }, duration: 10 };
      expect(travelPose(plan, 0).position).toEqual(plan.start);
      expect(travelPose(plan, 1).position).toEqual(plan.end);
      expect(travelPose(plan, 0.5).position).toEqual({ x: 0, y: 1, z: -0.2 });
      expect(travelPose(plan, 0.5).tanScale).toBe(1);
    });
  });

  describe('Arrive', () => {
    it('should fly further when the frame holds than when the camera zooms in', () => {
      expect(planArrive(settings({ zoomIn: true })).reach).toBe(ARRIVE_REACH_ZOOM);
      expect(planArrive(settings({ zoomIn: false })).reach).toBe(ARRIVE_REACH_HOLD);
    });

    it('should arrive sooner at a higher speed', () => {
      expect(planArrive(settings({ speed: 8 })).duration).toBeLessThan(planArrive(settings({ speed: 4 })).duration);
    });

    it('should start at rest, end at the full reach and never move backward', () => {
      const s = settings({ style: 'arrive' });
      const plan = planArrive(s);
      expect(arrivePose(plan, 0, 0, s).position.z).toBeCloseTo(0, 9);
      expect(arrivePose(plan, 1, 0, s).position.z).toBeCloseTo(-plan.reach, 9);
      let previous = 0;
      for (let u = 0; u <= 1; u += 0.05) {
        const z = arrivePose(plan, u, 0, s).position.z;
        expect(z).toBeLessThanOrEqual(previous + 1e-9);
        previous = z;
      }
    });

    it('should keep the resting lens when zooming in and widen it when the frame holds', () => {
      const zoom = settings({ style: 'arrive', zoomIn: true });
      const hold = settings({ style: 'arrive', zoomIn: false });
      expect(arrivePose(planArrive(zoom), 1, 0, zoom).tanScale).toBe(1);
      // Widening by 1 / (distance left) keeps the far backdrop exactly the same size.
      const pose = arrivePose(planArrive(hold), 1, 0, hold);
      expect(pose.tanScale * (1 + pose.position.z)).toBeCloseTo(1, 9);
    });

    it('should clear the remaining stars just before settling', () => {
      const s = settings({ style: 'arrive' });
      const plan = planArrive(s);
      expect(arrivePose(plan, 0.5, 0, s).starFade).toBe(1);
      expect(arrivePose(plan, 1, 0, s).starFade).toBe(0);
    });

    it('should bring the photo’s stars back only after settling, and only when asked', () => {
      const on = settings({ style: 'arrive', starsReturn: true });
      const off = settings({ style: 'arrive', starsReturn: false });
      const plan = planArrive(on);
      expect(arrivePose(plan, 1, 0, on).photoMix).toBe(0);
      expect(arrivePose(plan, 1, 10, on).photoMix).toBe(1);
      expect(arrivePose(plan, 1, 10, off).photoMix).toBe(0);
    });
  });

  it('should ease smoothly between zero and one and clamp outside', () => {
    expect(smoothStep(-1)).toBe(0);
    expect(smoothStep(0.5)).toBeCloseTo(0.5, 9);
    expect(smoothStep(2)).toBe(1);
  });
});
