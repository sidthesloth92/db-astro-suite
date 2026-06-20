import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

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

  it('should spawn receding streaks spread wider than approaching ones so they cross the frame', () => {
    spyOn(Math, 'random').and.returnValue(0.95); // push each spawn toward its spread edge

    service.starDepth.set('out');
    const approaching = spawned();
    const approachingSpread = Math.abs(approaching.x) / approaching.z;

    service.starDepth.set('in');
    const receding = spawned();
    const recedingSpread = Math.abs(receding.x) / receding.z;

    // Receding ('in') streaks start much wider so they streak inward across the
    // frame instead of being born and dying in a tight central cluster.
    expect(recedingSpread).toBeGreaterThan(approachingSpread);
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
