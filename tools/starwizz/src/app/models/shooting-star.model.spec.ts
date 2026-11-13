import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

import { SHOOTING_STAR_TRAIL_LENGTH } from '../constants/shooting-star.constant';
import { SimulationService } from '../services/simulation.service';
import { ShootingStar } from './shooting-star.model';

const WIDTH = 1000;
const HEIGHT = 2000;

describe('ShootingStar', () => {
  let service: SimulationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: {} }],
    });
    service = TestBed.inject(SimulationService);
    service.controls.shootingStarSpeed.set(1);
  });

  function spawned(): ShootingStar {
    const star = new ShootingStar(WIDTH, HEIGHT, service);
    star.spawn();
    return star;
  }

  it('should streak outward (z decreasing) for out depth', () => {
    service.starDepth.set('out');
    const star = spawned();
    const z0 = star.z;

    star.update();

    expect(star.z).toBeLessThan(z0);
    expect(star.isActive).toBe(true);
  });

  it('should recede (z increasing) for in depth', () => {
    service.starDepth.set('in');
    const star = spawned();
    const z0 = star.z;

    star.update();

    expect(star.z).toBeGreaterThan(z0);
  });

  describe('spawning out of view', () => {
    const HALF_WIDTH = WIDTH / 2;
    const HALF_HEIGHT = HEIGHT / 2;
    const SPAWN_SAMPLES = 40;

    /** Where the streak's head lands on screen, in px from the frame centre. */
    function onScreen(star: ShootingStar): { x: number; y: number } {
      const k = WIDTH / star.z;
      return { x: star.x * k, y: star.y * k };
    }

    function isInVisibleFrame(point: { x: number; y: number }): boolean {
      return Math.abs(point.x) <= HALF_WIDTH && Math.abs(point.y) <= HALF_HEIGHT;
    }

    /**
     * Flies a streak until it retires. Reports whether its head was ever in the
     * visible frame and where the head was when the streak retired.
     */
    function flyUntilRetired(star: ShootingStar): {
      wasVisible: boolean;
      retiredAt: { x: number; y: number };
    } {
      let wasVisible = false;
      for (let frame = 0; frame < 100_000 && star.isActive; frame++) {
        wasVisible = wasVisible || isInVisibleFrame(onScreen(star));
        star.update();
      }
      expect(star.isActive).withContext('streak eventually retires').toBe(false);
      return { wasVisible, retiredAt: onScreen(star) };
    }

    function setLateralDrift(degrees: number): void {
      service.starDepth.set('none');
      service.starLateralOn.set(true);
      service.starDirectionDeg.set(degrees);
    }

    beforeEach(() => {
      service.controls.shootingStarSpeed.set(8); // cross the frame in fewer frames
    });

    it('should spawn beyond the left edge when drifting right', () => {
      setLateralDrift(0);
      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        const start = onScreen(spawned());
        expect(start.x).toBeLessThan(-HALF_WIDTH);
        expect(Math.abs(start.y)).toBeLessThanOrEqual(HALF_HEIGHT);
      }
    });

    it('should spawn beyond the right edge when drifting left', () => {
      setLateralDrift(180);
      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        expect(onScreen(spawned()).x).toBeGreaterThan(HALF_WIDTH);
      }
    });

    it('should spawn beyond the bottom edge when drifting up', () => {
      setLateralDrift(90);
      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        expect(onScreen(spawned()).y).toBeGreaterThan(HALF_HEIGHT);
      }
    });

    it('should spawn beyond the top edge when drifting down', () => {
      setLateralDrift(270);
      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        expect(onScreen(spawned()).y).toBeLessThan(-HALF_HEIGHT);
      }
    });

    it('should fly in from off-screen, cross the frame and retire past the far edge', () => {
      setLateralDrift(0);
      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        const star = spawned();

        star.update();
        expect(star.isActive).withContext('still flying in after the first frame').toBe(true);

        const flight = flyUntilRetired(star);
        expect(flight.wasVisible).toBe(true);
        expect(flight.retiredAt.x).toBeGreaterThan(HALF_WIDTH);
      }
    });

    it('should keep a streak until its trail has also left the frame', () => {
      setLateralDrift(0);
      const star = spawned();
      const headHistory: number[] = [];
      while (star.isActive) {
        headHistory.push(onScreen(star).x);
        star.update();
      }

      // Had it lived one more frame, its oldest trail point would have been the
      // head position this many frames back. That point is already past the
      // edge, so nothing visible disappears when the streak retires.
      const oldestTrailX = headHistory[headHistory.length - SHOOTING_STAR_TRAIL_LENGTH];
      expect(oldestTrailX).toBeGreaterThan(HALF_WIDTH);
    });

    it('should spawn receding streaks beyond the frame all around and streak them inward', () => {
      service.starDepth.set('in');
      service.starLateralOn.set(false);
      const frameCornerDistance = Math.hypot(HALF_WIDTH, HALF_HEIGHT);

      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        const star = spawned();
        const start = onScreen(star);
        // Beyond the corners, so off-screen however far the view has rotated.
        expect(Math.hypot(start.x, start.y)).toBeGreaterThan(frameCornerDistance);

        star.update();
        const next = onScreen(star);
        expect(Math.hypot(next.x, next.y)).toBeLessThan(Math.hypot(start.x, start.y));

        const flight = flyUntilRetired(star);
        expect(flight.wasVisible).toBe(true);
        // Retired at the far end, where it has shrunk to nothing.
        expect(star.z).toBeGreaterThanOrEqual(WIDTH);
      }
    });

    it('should spawn approaching streaks at the far end, where they have no size yet', () => {
      service.starDepth.set('out');
      service.starLateralOn.set(false);

      for (let i = 0; i < SPAWN_SAMPLES; i++) {
        const star = spawned();
        expect(star.z).toBe(WIDTH); // proximity 0 ⇒ drawn radius 0
        expect(isInVisibleFrame(onScreen(star))).toBe(true); // near the vanishing point
      }
    });

    it('should not retire an approaching streak while its head is in the frame', () => {
      service.starDepth.set('out');
      service.starLateralOn.set(false);
      const star = spawned();
      // Pin it clear of the centre line so it exits through an edge, not the camera.
      star.x = 60;
      star.y = 0;

      let lastVisibleFrameWasActive = true;
      while (star.isActive) {
        const wasInFrame = isInVisibleFrame(onScreen(star));
        star.update();
        if (wasInFrame && !star.isActive) {
          lastVisibleFrameWasActive = false;
        }
      }

      expect(lastVisibleFrameWasActive).toBe(true);
    });
  });

  it('should streak laterally when lateral drift is active', () => {
    service.starDepth.set('none');
    service.starLateralOn.set(true);
    service.starDirectionDeg.set(0); // right
    const star = spawned();
    const x0 = star.x;
    const z0 = star.z;

    star.update();

    expect(star.x).toBeGreaterThan(x0);
    expect(star.z).toBe(z0);
  });

  it('should deactivate immediately when there is no motion', () => {
    service.starDepth.set('none');
    service.starLateralOn.set(false);
    const star = spawned();

    star.update();

    expect(star.isActive).toBe(false);
  });

  it('should move proportionally to the background star speed (relative speed)', () => {
    service.starDepth.set('out');
    service.starLateralOn.set(false);
    service.controls.shootingStarSpeed.set(2); // 2× the star speed

    const measureDelta = (starSpeed: number): number => {
      service.controls.starSpeed.set(starSpeed);
      const star = spawned();
      // Pin to a stable mid-frame position so only the depth step changes z.
      star.x = 0;
      star.y = 0;
      star.z = WIDTH / 2;
      const z0 = star.z;
      star.update();
      return z0 - star.z; // outward ⇒ positive
    };

    const slowDelta = measureDelta(0.5);
    const fastDelta = measureDelta(10);

    expect(slowDelta).toBeGreaterThan(0);
    expect(fastDelta).toBeGreaterThan(slowDelta);
  });
});
