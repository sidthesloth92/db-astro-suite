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

    it('should re-enable shooting stars on reset', () => {
      service.shootingStarsEnabled.set(false);

      service.resetControlsToDefaults();

      expect(service.shootingStarsEnabled()).toBe(true);
    });
  });

  describe('clearImage', () => {
    it('should return the whole simulation to its fresh-page state', () => {
      // Drive the simulation well away from defaults first.
      service.isImageLoaded.set(true);
      service.isDefaultImage.set(true);
      service.userImage.set('data:image/png;base64,abc');
      service.currentFormat.set('youtube-4k');
      service.controls.starCount.set(500);
      service.shootingStarsEnabled.set(false);
      service.updateDirection('path');
      service.setCameraStart();
      service.setCameraEnd();
      service.finalizePath();

      service.clearImage();

      // Image flags cleared.
      expect(service.isImageLoaded()).toBe(false);
      expect(service.isDefaultImage()).toBe(false);
      expect(service.userImage()).toBeNull();
      expect(service.galaxyImage()).toBeNull();
      // Output format back to the default.
      expect(service.currentFormat()).toBe('reels');
      // Controls + shooting-star toggle back to defaults.
      expect(service.controls.starCount()).toBe(1000);
      expect(service.shootingStarsEnabled()).toBe(true);
      // Forward star motion restored so the next upload animates immediately.
      expect(service.travelDirection()).toBe('forward');
      expect(service.starDepth()).toBe('out');
      expect(service.starLateralOn()).toBe(false);
      expect(service.hasStarMotion()).toBe(true);
      // Custom path cleared.
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

  describe('Recording quality presets', () => {
    it('should default to the Social Media preset', () => {
      expect(service.recordingPreset()).toBe('social');
    });

    it('should derive the encoder bitrate from the format, fps and preset budget', () => {
      // Default reels format (1080×1920), social: 60 fps × 0.10 bpp.
      expect(service.recordingBitsPerSecond()).toBe(12_441_600);

      service.recordingPreset.set('maximum');
      expect(service.recordingBitsPerSecond()).toBe(18_662_400);

      service.recordingPreset.set('compact');
      expect(service.recordingBitsPerSecond()).toBe(4_354_560);

      service.recordingPreset.set('social');
      service.currentFormat.set('youtube-4k');
      expect(service.recordingBitsPerSecond()).toBe(49_766_400);
    });

    it('should clamp small formats up to the minimum bitrate', () => {
      service.currentFormat.set('youtube-720p');
      service.recordingPreset.set('compact');

      expect(service.recordingBitsPerSecond()).toBe(4_000_000);
    });

    it('should restore the default preset on clearImage', () => {
      service.recordingPreset.set('maximum');

      service.clearImage();

      expect(service.recordingPreset()).toBe('social');
    });
  });

  describe('startRecording', () => {
    /** Constructor arguments captured by the MediaRecorder test double. */
    let constructed: { stream: MediaStream; options?: MediaRecorderOptions }[];
    /** Per-test predicate backing the static isTypeSupported double. */
    let isTypeSupported: (type: string) => boolean;
    let originalMediaRecorder: typeof MediaRecorder;
    let canvas: HTMLCanvasElement;

    class FakeMediaRecorder {
      static isTypeSupported(type: string): boolean {
        return isTypeSupported(type);
      }
      state: RecordingStateNative = 'inactive';
      ondataavailable: ((e: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        constructed.push({ stream, options });
      }
      start(): void {
        this.state = 'recording';
      }
      stop(): void {
        this.state = 'inactive';
      }
    }
    /** Alias for the native MediaRecorder state union (distinct from the app's RecordingState). */
    type RecordingStateNative = 'inactive' | 'recording' | 'paused';

    beforeEach(() => {
      constructed = [];
      isTypeSupported = () => true;
      originalMediaRecorder = window.MediaRecorder;
      // Test double swap: the fake matches the constructor/static surface the
      // service touches, so the structural cast is safe here.
      window.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder;
      canvas = document.createElement('canvas');
      spyOn(canvas, 'captureStream').and.returnValue(new MediaStream());
    });

    afterEach(() => {
      // Stops the fake recorder and clears the duration/auto-stop timers.
      service.stopRecording();
      window.MediaRecorder = originalMediaRecorder;
    });

    it('should prefer H.264 High-profile MP4 when the browser supports it', () => {
      service.startRecording(canvas);

      expect(constructed[0].options?.mimeType).toBe('video/mp4;codecs=avc1.640034');
    });

    it('should walk the codec ladder down to VP9 WebM when MP4 is unavailable', () => {
      isTypeSupported = (type) => type === 'video/webm;codecs=vp9';

      service.startRecording(canvas);

      expect(constructed[0].options?.mimeType).toBe('video/webm;codecs=vp9');
    });

    it('should fall back to plain WebM when nothing is reported as supported', () => {
      isTypeSupported = () => false;

      service.startRecording(canvas);

      expect(constructed[0].options?.mimeType).toBe('video/webm');
    });

    it('should pass the preset bitrate to the recorder', () => {
      service.startRecording(canvas);

      expect(constructed[0].options?.videoBitsPerSecond).toBe(service.recordingBitsPerSecond());
      expect(constructed[0].options?.videoBitsPerSecond).toBe(12_441_600);
    });

    it('should capture the canvas at the preset frame rate', () => {
      service.startRecording(canvas);
      expect(canvas.captureStream).toHaveBeenCalledWith(60);

      service.stopRecording();
      service.recordingPreset.set('compact');
      service.startRecording(canvas);
      expect(canvas.captureStream).toHaveBeenCalledWith(30);
    });

    it('should reset to idle when the recorder cannot be created', () => {
      spyOn(console, 'error');
      isTypeSupported = () => {
        throw new Error('boom');
      };
      service.recordingState.set('recording');

      service.startRecording(canvas);

      expect(service.recordingState()).toBe('idle');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
