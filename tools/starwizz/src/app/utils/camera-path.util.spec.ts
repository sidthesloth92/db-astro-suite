import {
  ARRIVE_REACH_HOLD,
  ARRIVE_REACH_ZOOM,
  LATERAL_OVERSCAN,
  ROTATION_RATE_PER_UNIT,
  SCENE3D_CONTROLS,
  TRAVEL_MAX_ZOOM,
} from '../constants/scene3d.constant';
import { FrameView, ScenePose, TravelPlan } from '../models/scene-pose.model';
import { Scene3dSettings } from '../models/scene3d-settings.model';
import {
  arrivePose,
  coverFor,
  frameShot,
  frameView,
  overscanFor,
  planArrive,
  planTravel,
  reliefFor,
  shotReach,
  smoothStep,
  starFarDepth,
  travelPose,
  travelVelocity,
  turnRate,
} from './camera-path.util';

const BASE: Scene3dSettings = {
  style: 'travel',
  direction: 'forward',
  aim: { x: 0, y: 0 },
  starStyle: 'original',
  zoomIn: true,
  starsReturn: true,
  speed: SCENE3D_CONTROLS.speed.initial,
  rotation: 0,
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

/**
 * True when no corner of the frame, turned as the pose turns it, ever shows past the edge of
 * the photo. Checked far more finely than the code under test samples a shot.
 */
function turningFrameStaysOnPhoto(view: FrameView, poseAt: (progress: number) => ScenePose): boolean {
  const steps = 2000;
  for (let i = 0; i <= steps; i++) {
    const pose = poseAt(i / steps);
    const size = (1 + pose.position.z) * pose.tanScale;
    for (const [cx, cy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = cx * view.tanX * size;
      const y = cy * view.tanY * size;
      // The picture turns clockwise by `roll`, so the frame sits anticlockwise on the photo.
      const onPhotoX = pose.position.x + x * Math.cos(pose.roll) - y * Math.sin(pose.roll);
      const onPhotoY = pose.position.y + x * Math.sin(pose.roll) + y * Math.cos(pose.roll);
      if (Math.abs(onPhotoX) > (view.imageAspect / 2) * 1.002 || Math.abs(onPhotoY) > 0.5 * 1.002) {
        return false;
      }
    }
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

    it('should slide more slowly, not past the edge, when the photo has no room to spare', () => {
      // No overscan and a photo the same shape as the frame: nothing to slide into.
      const tight = frameView(9 / 16, 9 / 16, 1);
      const plan = planTravel(settings({ direction: 'left' }), tight, 0.6);
      expect(plan.duration).toBeGreaterThan(0);
      expect(staysInsidePhoto(plan, tight)).toBeTrue();
    });

    it('should use the spare width of a wide photo for a longer sideways shot', () => {
      const s = settings({ direction: 'left' });
      const narrow = planTravel(s, frameView(9 / 16, 9 / 16, overscanFor(s)), 0.6);
      const wide = planTravel(s, frameView(16 / 9, 9 / 16, overscanFor(s)), 0.6);
      expect(wide.duration).toBeGreaterThan(narrow.duration);
    });
  });

  describe('travelPose', () => {
    it('should move at constant speed from start to end', () => {
      const plan: TravelPlan = { start: { x: -1, y: 0, z: 0 }, end: { x: 1, y: 2, z: -0.4 }, duration: 10, turn: 0 };
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
  describe('rotation', () => {
    const PHOTO = 9 / 16;
    const FRAME = 9 / 16;
    const FAR = 0.6;

    it('should turn the view one degree a second per Rotation unit, clockwise to the right of the middle', () => {
      expect(turnRate(settings({ rotation: 0 }))).toBe(0);
      expect(turnRate(settings({ rotation: 4 }))).toBeCloseTo((4 * Math.PI) / 180, 12);
      expect(turnRate(settings({ rotation: -4 }))).toBeCloseTo((-4 * Math.PI) / 180, 12);
      expect(ROTATION_RATE_PER_UNIT).toBeCloseTo(Math.PI / 180, 12);
    });

    it('should keep a Travel shot upright when Rotation is off', () => {
      const plan = planTravel(settings({ rotation: 0 }), frameView(PHOTO, FRAME, 1), FAR);
      expect(plan.turn).toBe(0);
      expect(travelPose(plan, 0.7).roll).toBe(0);
    });

    it('should start a Travel shot upright and turn it steadily for as long as it lasts', () => {
      const s = settings({ rotation: 3 });
      const plan = planTravel(s, frameView(PHOTO, FRAME, 1), FAR);
      expect(plan.turn).toBeCloseTo(turnRate(s) * plan.duration, 12);
      expect(travelPose(plan, 0).roll).toBe(0);
      expect(travelPose(plan, 0.25).roll).toBeCloseTo(plan.turn / 4, 12);
      expect(travelPose(plan, 1).roll).toBeCloseTo(plan.turn, 12);
    });

    it('should turn the other way to the left of the middle, and faster the further the handle is moved', () => {
      const view = frameView(PHOTO, FRAME, 1);
      const right = planTravel(settings({ rotation: 2 }), view, FAR);
      const left = planTravel(settings({ rotation: -2 }), view, FAR);
      const faster = planTravel(settings({ rotation: 8 }), view, FAR);
      expect(travelPose(left, 0.5).roll).toBeCloseTo(-travelPose(right, 0.5).roll, 12);
      expect(travelPose(faster, 0.5).roll).toBeCloseTo(4 * travelPose(right, 0.5).roll, 12);
    });

    it('should turn every Travel direction, sideways ones included', () => {
      for (const direction of ['forward', 'backward', 'left', 'right', 'up', 'down', 'custom'] as const) {
        const s = settings({ direction, rotation: 5 });
        const { view, cover } = frameShot(s, 16 / 9, FRAME, FAR);
        const plan = planTravel(s, view, FAR, cover);
        expect(travelPose(plan, 1).roll).withContext(direction).toBeGreaterThan(0);
      }
    });

    it('should end an Arrive shot upright, having turned back at the chosen rate and slowed to a stop', () => {
      const s = settings({ style: 'arrive', rotation: 6 });
      const plan = planArrive(s);
      // Starts turned back by what a steadily slowing turn covers: half of rate x time.
      expect(arrivePose(plan, 0, 0, s).roll).toBeCloseTo((-turnRate(s) * plan.duration) / 2, 12);
      expect(arrivePose(plan, 1, 0, s).roll).toBe(0);
      expect(arrivePose(plan, 1, 2, s).roll).toBe(0);
      // Clockwise all the way, and slower in the second half than in the first.
      const quarter = arrivePose(plan, 0.25, 0, s).roll;
      const half = arrivePose(plan, 0.5, 0, s).roll;
      const threeQuarters = arrivePose(plan, 0.75, 0, s).roll;
      expect(quarter).toBeGreaterThan(arrivePose(plan, 0, 0, s).roll);
      expect(half).toBeGreaterThan(quarter);
      expect(threeQuarters).toBeGreaterThan(half);
      expect(threeQuarters - half).toBeLessThan(half - quarter);
      // The first instant turns at the chosen rate.
      const step = 1e-4;
      const startRate = (arrivePose(plan, step, 0, s).roll - arrivePose(plan, 0, 0, s).roll) / (step * plan.duration);
      expect(startRate).toBeCloseTo(turnRate(s), 3);
    });

    it('should keep an Arrive shot upright throughout when Rotation is off', () => {
      const s = settings({ style: 'arrive', rotation: 0 });
      const plan = planArrive(s);
      expect(arrivePose(plan, 0, 0, s).roll).toBe(0);
      expect(arrivePose(plan, 0.4, 0, s).roll).toBe(0);
    });

    describe('coverFor', () => {
      const view = frameView(PHOTO, FRAME, 1);

      it('should be the lens itself for a frame that does not turn', () => {
        const cover = coverFor(view, 0);
        expect(cover.tanX).toBeCloseTo(view.tanX, 12);
        expect(cover.tanY).toBeCloseTo(view.tanY, 12);
        expect(cover.imageAspect).toBe(view.imageAspect);
      });

      it('should grow with the turn until it is as wide and as tall as the frame’s diagonal', () => {
        const diagonal = Math.hypot(view.tanX, view.tanY);
        const little = coverFor(view, 0.1);
        const more = coverFor(view, 0.4);
        expect(little.tanX).toBeGreaterThan(view.tanX);
        expect(more.tanX).toBeGreaterThan(little.tanX);
        expect(more.tanX).toBeLessThan(diagonal);
        for (const turn of [Math.PI / 2, 2, 7, -7]) {
          expect(coverFor(view, turn).tanX).withContext(`turn ${turn}`).toBeCloseTo(diagonal, 12);
          expect(coverFor(view, turn).tanY).withContext(`turn ${turn}`).toBeCloseTo(diagonal, 12);
        }
      });

      it('should hold the frame at every angle up to the turn, whichever way it turns', () => {
        for (const turn of [0.2, -0.6, 1.1, 3]) {
          const cover = coverFor(view, turn);
          for (let angle = 0; angle <= Math.abs(turn); angle += 0.01) {
            const width = view.tanX * Math.abs(Math.cos(angle)) + view.tanY * Math.abs(Math.sin(angle));
            const height = view.tanX * Math.abs(Math.sin(angle)) + view.tanY * Math.abs(Math.cos(angle));
            expect(width).toBeLessThanOrEqual(cover.tanX + 1e-9);
            expect(height).toBeLessThanOrEqual(cover.tanY + 1e-9);
          }
        }
      });
    });

    describe('shotReach', () => {
      const view = frameView(PHOTO, FRAME, 1);
      const still = (roll: number): ScenePose => ({
        position: { x: 0, y: 0, z: 0 },
        roll,
        tanScale: 1,
        starFade: 1,
        photoMix: 0,
      });

      it('should be 1 when the upright frame just fills the photo', () => {
        expect(shotReach(view, () => still(0))).toBeCloseTo(1, 9);
      });

      it('should say how far a turned frame would show past the photo’s edge', () => {
        // A quarter turn lays the tall frame across the narrow photo.
        expect(shotReach(view, () => still(Math.PI / 2))).toBeCloseTo(view.tanY / view.tanX, 9);
      });

      it('should count a camera that has moved closer as seeing less of the photo', () => {
        const closer: ScenePose = { ...still(0), position: { x: 0, y: 0, z: -0.5 } };
        expect(shotReach(view, () => closer)).toBeCloseTo(0.5, 9);
      });
    });

    describe('frameShot', () => {
      it('should frame a shot exactly as before when Rotation is off', () => {
        for (const direction of ['forward', 'left', 'custom'] as const) {
          const s = settings({ direction, rotation: 0 });
          const { view, cover } = frameShot(s, 16 / 9, FRAME, FAR);
          expect(view).toEqual(frameView(16 / 9, FRAME, overscanFor(s)));
          expect(cover).toBe(view);
        }
      });

      it('should never show past the edge of the photo, whatever the style, direction, rate or photo shape', () => {
        const shapes = [9 / 16, 1, 3 / 2, 16 / 9];
        for (const imageAspect of shapes) {
          for (const frameAspect of [9 / 16, 1, 16 / 9]) {
            for (const rotation of [1, -3, 10]) {
              for (const direction of ['forward', 'backward', 'left', 'right', 'up', 'down', 'custom'] as const) {
                const s = settings({ direction, rotation, aim: { x: 0.3, y: -0.25 } });
                const { view, cover } = frameShot(s, imageAspect, frameAspect, FAR);
                const plan = planTravel(s, view, FAR, cover);
                expect(turningFrameStaysOnPhoto(view, (u) => travelPose(plan, u)))
                  .withContext(`travel ${direction}, rotation ${rotation}, photo ${imageAspect}, frame ${frameAspect}`)
                  .toBeTrue();
              }
              for (const zoomIn of [true, false]) {
                const s = settings({ style: 'arrive', rotation, zoomIn });
                const { view } = frameShot(s, imageAspect, frameAspect, FAR);
                const plan = planArrive(s);
                expect(turningFrameStaysOnPhoto(view, (u) => arrivePose(plan, u, 0, s)))
                  .withContext(`arrive, zoom in ${zoomIn}, rotation ${rotation}, photo ${imageAspect}, frame ${frameAspect}`)
                  .toBeTrue();
              }
            }
          }
        }
      });

      it('should zoom in no more than the turn needs: a little for a slow turn, more for a fast one', () => {
        const rest = frameView(PHOTO, FRAME, 1);
        const zoom = (rotation: number): number =>
          rest.tanY / frameShot(settings({ rotation }), PHOTO, FRAME, FAR).view.tanY;
        expect(zoom(0)).toBe(1);
        // Flying forward shows less of the photo as it goes, which pays for a slow turn.
        expect(zoom(1)).toBeGreaterThan(1);
        expect(zoom(1)).toBeLessThan(1.15);
        expect(zoom(4)).toBeGreaterThan(zoom(1));
        expect(zoom(10)).toBeGreaterThan(zoom(4));
        // Never more than a frame that could turn all the way round at rest would need.
        expect(zoom(10)).toBeLessThanOrEqual(Math.hypot(rest.tanX, rest.tanY) / rest.tanX + 1e-9);
      });

      it('should need the same zoom whichever way the view turns', () => {
        const right = frameShot(settings({ rotation: 5 }), 3 / 2, FRAME, FAR).view;
        const left = frameShot(settings({ rotation: -5 }), 3 / 2, FRAME, FAR).view;
        expect(left.tanY).toBeCloseTo(right.tanY, 12);
      });

      it('should give the stars the whole box the turning frame stays inside', () => {
        const s = settings({ rotation: 6 });
        const { view, cover } = frameShot(s, PHOTO, FRAME, FAR);
        const plan = planTravel(s, view, FAR, cover);
        expect(cover.tanX).toBeGreaterThan(view.tanX);
        for (let u = 0; u <= 1; u += 0.01) {
          const roll = travelPose(plan, u).roll;
          expect(view.tanX * Math.abs(Math.cos(roll)) + view.tanY * Math.abs(Math.sin(roll))).toBeLessThanOrEqual(
            cover.tanX + 1e-9,
          );
          expect(view.tanX * Math.abs(Math.sin(roll)) + view.tanY * Math.abs(Math.cos(roll))).toBeLessThanOrEqual(
            cover.tanY + 1e-9,
          );
        }
      });
    });
  });
});
