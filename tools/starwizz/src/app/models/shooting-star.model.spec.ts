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
});
