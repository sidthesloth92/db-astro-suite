import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

import { Star } from '../models/star.model';
import { SimulationService } from './simulation.service';

const WIDTH = 1000;
const HEIGHT = 2000;

describe('SimulationService', () => {
  let service: SimulationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: {} }],
    });
    service = TestBed.inject(SimulationService);
  });

  function seedStars(count: number): Star[] {
    const stars = Array.from({ length: count }, () => new Star(WIDTH, HEIGHT, service));
    service.stars.set(stars);
    return stars;
  }

  describe('adjustStarCount', () => {
    it('should grow the field to the target count, replacing the array immutably', () => {
      const initial = seedStars(500);
      service.controls.starCount.set(800);

      service.adjustStarCount(WIDTH, HEIGHT);

      expect(service.stars().length).toBe(800);
      expect(service.stars()).not.toBe(initial);
    });

    it('should shrink the field to the target count', () => {
      seedStars(1200);
      service.controls.starCount.set(600);

      service.adjustStarCount(WIDTH, HEIGHT);

      expect(service.stars().length).toBe(600);
    });

    it('should no-op while the field is empty so it never clobbers a pending generation', () => {
      service.controls.starCount.set(1500);

      service.adjustStarCount(WIDTH, HEIGHT);

      expect(service.stars().length).toBe(0);
    });
  });

  describe('resetControlsToDefaults', () => {
    it('should restore the travel direction and star defaults to forward', () => {
      service.updateDirection('right');

      service.resetControlsToDefaults();

      expect(service.travelDirection()).toBe('forward');
      expect(service.starDepth()).toBe('out');
      expect(service.starLateralOn()).toBe(false);
    });

    it('should clear a custom path on reset', () => {
      service.updateDirection('path');
      service.setCameraStart();
      service.setCameraEnd();
      service.finalizePath();

      service.resetControlsToDefaults();

      expect(service.cameraStart()).toBeNull();
      expect(service.cameraEnd()).toBeNull();
      expect(service.pathFinalized()).toBe(false);
    });
  });

  describe('Custom Path (A→B)', () => {
    it('should report path mode only for the path direction', () => {
      service.updateDirection('forward');
      expect(service.isPathMode()).toBe(false);

      service.updateDirection('path');
      expect(service.isPathMode()).toBe(true);
    });

    it('should capture the live framing into Start and End', () => {
      service.updateLiveCamera({ panX: 100, panY: -40, scale: 2 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: -60, panY: 20, scale: 1.2 });
      service.setCameraEnd();

      expect(service.cameraStart()).toEqual({ panX: 100, panY: -40, scale: 2 });
      expect(service.cameraEnd()).toEqual({ panX: -60, panY: 20, scale: 1.2 });
    });

    it('should allow play only once both Start and End are set', () => {
      expect(service.canPlayPath()).toBe(false);
      service.setCameraStart();
      expect(service.canPlayPath()).toBe(false);
      service.setCameraEnd();
      expect(service.canPlayPath()).toBe(true);
    });

    it('should clamp the live zoom within bounds', () => {
      service.updateLiveCamera({ scale: 99 });
      expect(service.liveCamera().scale).toBe(5); // MAX_ZOOM
      service.updateLiveCamera({ scale: 0.1 });
      expect(service.liveCamera().scale).toBe(1); // MIN_SCALE
    });

    it('should keep Speed and Duration consistent (the linked pair)', () => {
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 300, panY: 400, scale: 1 });
      service.setCameraEnd();
      // pan distance = hypot(300,400) = 500
      service.setPathDuration(5);
      expect(service.pathSpeed()).toBeCloseTo(100, 5); // 500 / 5
      expect(service.pathDurationSeconds()).toBeCloseTo(5, 5);
    });

    it('should ignore live-camera edits while a glide is playing', () => {
      service.setCameraStart();
      service.setCameraEnd();
      service.playPath();
      const frozen = service.liveCamera();

      service.updateLiveCamera({ panX: 999 });

      expect(service.liveCamera()).toEqual(frozen);
    });

    it('should stop playback and apply preset star defaults when leaving path mode', () => {
      service.updateDirection('path');
      service.setCameraStart();
      service.setCameraEnd();
      service.playPath();
      expect(service.pathPlaying()).toBe(true);

      service.updateDirection('forward');

      expect(service.pathPlaying()).toBe(false);
      expect(service.starDepth()).toBe('out');
      expect(service.starLateralOn()).toBe(false);
    });

    it('should clear all path state on resetPath', () => {
      service.setCameraStart();
      service.setCameraEnd();
      service.updateLiveCamera({ panX: 50 });

      service.resetPath();

      expect(service.cameraStart()).toBeNull();
      expect(service.cameraEnd()).toBeNull();
      expect(service.pathFinalized()).toBe(false);
      expect(service.liveCamera()).toEqual({ panX: 0, panY: 0, scale: 1 });
    });

    it('should fix the path, lock it, and play once', () => {
      service.setCameraStart();
      service.setCameraEnd();

      service.finalizePath();

      expect(service.pathFinalized()).toBe(true);
      expect(service.pathPlaying()).toBe(true);
    });

    it('should not fix the path until both points are set', () => {
      service.setCameraStart();

      service.finalizePath();

      expect(service.pathFinalized()).toBe(false);
      expect(service.pathPlaying()).toBe(false);
    });

    it('should unlock and stop the loop on editPath', () => {
      service.setCameraStart();
      service.setCameraEnd();
      service.finalizePath();

      service.editPath();

      expect(service.pathFinalized()).toBe(false);
      expect(service.pathPlaying()).toBe(false);
    });
  });

  describe('Star Direction (derived from A→B)', () => {
    it('sets outward depth, no lateral, for the Forward preset', () => {
      service.updateDirection('forward');

      expect(service.starDepth()).toBe('out');
      expect(service.starLateralOn()).toBe(false);
    });

    it('sets pure lateral drift at 0° for the Right preset', () => {
      service.updateDirection('right');

      expect(service.starDepth()).toBe('none');
      expect(service.starLateralOn()).toBe(true);
      expect(service.starDirectionDeg()).toBe(0);
    });

    it('derives outward depth AND lateral drift from a zoom-in pan path', () => {
      service.updateDirection('path');
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 100, panY: 0, scale: 2 });
      service.setCameraEnd();

      service.finalizePath();

      expect(service.starDepth()).toBe('out'); // zoom-in
      expect(service.starLateralOn()).toBe(true); // combined with the pan
      expect(service.starDirectionDeg()).toBe(0); // +x ⇒ 0°
    });

    it('derives inward depth AND lateral drift from a zoom-out pan path', () => {
      service.updateDirection('path');
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 2 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 0, panY: 100, scale: 1 });
      service.setCameraEnd();

      service.finalizePath();

      expect(service.starDepth()).toBe('in'); // zoom-out
      expect(service.starLateralOn()).toBe(true); // combined with the pan
    });

    it('derives pure lateral for a same-zoom pan path', () => {
      service.updateDirection('path');
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1.5 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 200, panY: 0, scale: 1.5 });
      service.setCameraEnd();

      service.finalizePath();

      expect(service.starDepth()).toBe('none');
      expect(service.starLateralOn()).toBe(true);
      expect(service.starDirectionDeg()).toBe(0);
    });

    it('derives pure depth (no lateral) for a pure-zoom path', () => {
      service.updateDirection('path');
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 2 });
      service.setCameraEnd();

      service.finalizePath();

      expect(service.starDepth()).toBe('out');
      expect(service.starLateralOn()).toBe(false);
    });

    it('reports hasStarMotion correctly', () => {
      service.updateDirection('forward');
      expect(service.hasStarMotion()).toBe(true);

      service.updateDirection('path'); // no A/B ⇒ none + lateral off
      expect(service.hasStarMotion()).toBe(false);
    });

    it('engages lateral drift via setStarLateral and updateStarDirection', () => {
      service.updateDirection('path');
      expect(service.starLateralOn()).toBe(false);

      service.setStarLateral(true);
      expect(service.starLateralOn()).toBe(true);

      service.updateStarDirection(45);
      expect(service.starDirectionDeg()).toBe(45);
      expect(service.starLateralOn()).toBe(true);
    });

    it('clears points and zeroes star motion on resetPath', () => {
      service.updateDirection('path');
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 2 });
      service.setCameraEnd();
      service.finalizePath();
      expect(service.starDepth()).toBe('out');

      service.resetPath();

      expect(service.cameraStart()).toBeNull();
      expect(service.cameraEnd()).toBeNull();
      expect(service.starDepth()).toBe('none');
      expect(service.starLateralOn()).toBe(false);
      expect(service.hasStarMotion()).toBe(false);
    });
  });
});
