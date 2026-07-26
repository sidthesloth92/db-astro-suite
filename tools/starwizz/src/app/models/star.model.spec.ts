import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

import { STAR_DEPTH_FACTOR } from '../constants/simulation.constant';
import { STAR_COLORS, WHITE_STAR_INDEX } from '../constants/star-appearance.constant';
import { SimulationService } from '../services/simulation.service';
import { Star } from './star.model';

const WIDTH = 1000;
const HEIGHT = 2000;

describe('Star', () => {
  let service: SimulationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: {} }],
    });
    service = TestBed.inject(SimulationService);
    // Max slider value so one step is clearly visible after the internal remap.
    service.controls.starSpeed.set(10);
  });

  function makeStarAt(x: number, y: number, z: number): Star {
    const star = new Star(WIDTH, HEIGHT, service);
    star.x = x;
    star.y = y;
    star.z = z;
    return star;
  }

  it('should move toward the viewer (z decreasing) when travelling forward', () => {
    service.updateDirection('forward');
    const star = makeStarAt(0, 0, 500);

    star.update();

    // Star speed is routed through the internal multiplier and scaled by the
    // depth factor, so the step is getInternalValue('starSpeed') × STAR_DEPTH_FACTOR.
    expect(star.z).toBeCloseTo(500 - service.getInternalValue('starSpeed') * STAR_DEPTH_FACTOR, 5);
  });

  it('should move away (z increasing) when travelling backward', () => {
    service.updateDirection('backward');
    const star = makeStarAt(0, 0, 500);

    star.update();

    expect(star.z).toBeCloseTo(500 + service.getInternalValue('starSpeed') * STAR_DEPTH_FACTOR, 5);
  });

  it('should drift sideways without changing depth when travelling laterally', () => {
    service.updateDirection('right');
    const star = makeStarAt(0, 0, 500);

    star.update();

    expect(star.x).toBeGreaterThan(0);
    expect(star.z).toBe(500);
  });

  it('should wrap depth back to the far plane after passing the camera', () => {
    service.updateDirection('forward');
    const star = makeStarAt(0, 0, 1);

    star.update();

    expect(star.z).toBeGreaterThan(0);
    expect(star.z).toBeLessThanOrEqual(WIDTH);
  });

  it('should wrap the lateral axis back within the frame at the boundary', () => {
    service.updateDirection('right');
    const star = makeStarAt(WIDTH / 2 - 1, 0, 500);

    star.update();

    expect(star.x).toBeGreaterThanOrEqual(-WIDTH / 2);
    expect(star.x).toBeLessThanOrEqual(WIDTH / 2);
  });

  it('should stream up (negative y) for a flat 90° lateral drift', () => {
    service.starDepth.set('none');
    service.starLateralOn.set(true);
    service.starDirectionDeg.set(90);
    const star = makeStarAt(0, 0, 500);

    star.update();

    expect(star.y).toBeLessThan(0);
    expect(star.z).toBe(500);
  });

  it('should move in pure depth (no lateral) for the out mode', () => {
    service.starDepth.set('out');
    service.starLateralOn.set(false);
    const star = makeStarAt(0, 0, 500);

    star.update();

    expect(star.x).toBe(0);
    expect(star.y).toBe(0);
    expect(star.z).toBeLessThan(500);
  });

  it('should combine depth and lateral when both are active', () => {
    service.starDepth.set('out');
    service.starLateralOn.set(true);
    service.starDirectionDeg.set(0); // right
    const star = makeStarAt(0, 0, 500);

    star.update();

    expect(star.x).toBeGreaterThan(0); // lateral
    expect(star.z).toBeLessThan(500); // depth
  });

  it('should not move at all when depth is none and lateral is off', () => {
    service.starDepth.set('none');
    service.starLateralOn.set(false);
    const star = makeStarAt(0, 0, 500);

    star.update();

    expect(star.x).toBe(0);
    expect(star.y).toBe(0);
    expect(star.z).toBe(500);
  });

  it('should be born with a valid palette colour and a magnitude within [0, 1]', () => {
    const star = new Star(WIDTH, HEIGHT, service);

    expect(star.colorIndex).toBeGreaterThanOrEqual(0);
    expect(star.colorIndex).toBeLessThan(STAR_COLORS.length);
    expect(star.magnitude).toBeGreaterThanOrEqual(0);
    expect(star.magnitude).toBeLessThanOrEqual(1);
  });

  it('should keep its colour and magnitude when recycled via reset', () => {
    const star = new Star(WIDTH, HEIGHT, service);
    const colorIndex = star.colorIndex;
    const magnitude = star.magnitude;

    star.reset();

    expect(star.colorIndex).toBe(colorIndex);
    expect(star.magnitude).toBe(magnitude);
  });

  it('should spawn pure white when the colorful stars ratio is 0', () => {
    service.controls.colorfulStarRatio.set(0);
    const star = new Star(WIDTH, HEIGHT, service);

    expect(star.colorIndex).toBe(WHITE_STAR_INDEX);
  });

  it('should adopt the new colorful stars ratio when its colour is re-rolled', () => {
    const star = new Star(WIDTH, HEIGHT, service);

    service.controls.colorfulStarRatio.set(0);
    star.rerollColor();

    expect(star.colorIndex).toBe(WHITE_STAR_INDEX);
  });
});
