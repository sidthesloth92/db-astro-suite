import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

import { ShootingStar } from '../models/shooting-star.model';
import { Star } from '../models/star.model';
import { SimulationService } from './simulation.service';

const WIDTH = 1000;
const HEIGHT = 2000;

describe('SimulationService', () => {
  let service: SimulationService;
  let trackVideoGeneration: jasmine.Spy;

  beforeEach(() => {
    trackVideoGeneration = jasmine.createSpy('trackVideoGeneration');
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: { trackVideoGeneration } }],
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

    it('should re-enable the starfield on reset', () => {
      service.starsEnabled.set(false);

      service.resetControlsToDefaults();

      expect(service.starsEnabled()).toBe(true);
    });
  });

  describe('starsEnabled', () => {
    it('should default to true so the starfield renders on first load', () => {
      expect(service.starsEnabled()).toBe(true);
    });
  });

  describe('loading state coordination', () => {
    it('should hold the loading message when the stars finish before the default image settles', () => {
      // Default scene image still fetching over the network.
      service.isLoadingDefaultImage.set(true);

      service.markStarsReady();

      // Must NOT be 'Ready' — otherwise the overlay clears into a blank, control-less
      // preview while the image is still loading (the bug this fix addresses).
      expect(service.loadingProgress()).toBe('Loading Default Scene...');
    });

    it('should reach Ready once the image settles after the stars are already ready', () => {
      service.isLoadingDefaultImage.set(true);
      service.markStarsReady();

      // Image finishes loading: its handler clears the flag and re-settles the state.
      service.isLoadingDefaultImage.set(false);
      service.markStarsReady();

      expect(service.loadingProgress()).toBe('Ready');
    });

    it('should reach Ready when the image already settled before the stars finish', () => {
      // Image loaded first (or errored): no longer in flight.
      service.isLoadingDefaultImage.set(false);

      service.markStarsReady();

      expect(service.loadingProgress()).toBe('Ready');
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

    it('should clear in-flight shooting stars when the path is finalized', () => {
      // A streak captured under the previous direction, still in flight.
      const streak = new ShootingStar(WIDTH, HEIGHT, service);
      streak.spawn();
      service.shootingStars.set([streak]);
      expect(streak.isActive).toBe(true);

      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 200, panY: 0, scale: 2 });
      service.setCameraEnd();
      service.finalizePath();

      // Cleared so it respawns with the freshly-derived path motion.
      expect(streak.isActive).toBe(false);
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

  describe('getStarMotionSpeed', () => {
    function finalizePanPath(): void {
      service.updateDirection('path');
      service.updateLiveCamera({ panX: 0, panY: 0, scale: 1 });
      service.setCameraStart();
      service.updateLiveCamera({ panX: 300, panY: 0, scale: 1 });
      service.setCameraEnd();
      service.pathSpeed.set(150);
      service.finalizePath();
    }

    it('uses the absolute Star Speed value outside a fixed Custom Path', () => {
      service.updateDirection('forward');

      expect(service.getStarMotionSpeed()).toBeCloseTo(service.getInternalValue('starSpeed'), 5);
    });

    it('tracks the camera path pace once a Custom Path is finalized', () => {
      finalizePanPath();

      // pathSpeed / ASSUMED_FPS * PATH_STAR_SPEED_FACTOR * (slider / default)
      // = 150 / 60 * 0.6 * (5 / 5) = 1.5
      expect(service.getStarMotionSpeed()).toBeCloseTo(1.5, 5);
    });

    it('treats the Star Speed slider as a relative multiplier in a Custom Path', () => {
      finalizePanPath();
      service.updateControl('starSpeed', 10); // 2× the default slider

      expect(service.getStarMotionSpeed()).toBeCloseTo(3.0, 5);
    });

    it('scales with the chosen path speed so faster glides drive faster stars', () => {
      finalizePanPath();
      service.pathSpeed.set(300); // double the glide speed

      expect(service.getStarMotionSpeed()).toBeCloseTo(3.0, 5);
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
    /** Recorder instances created by the test double, in construction order. */
    let recorders: FakeMediaRecorder[];
    /** Per-test predicate backing the static isTypeSupported double. */
    let isTypeSupported: (type: string) => boolean;
    let originalMediaRecorder: typeof MediaRecorder;
    let canvas: HTMLCanvasElement;

    /** Alias for the native MediaRecorder state union (distinct from the app's RecordingState). */
    type RecordingStateNative = 'inactive' | 'recording' | 'paused';

    class FakeMediaRecorder {
      static isTypeSupported(type: string): boolean {
        return isTypeSupported(type);
      }
      state: RecordingStateNative = 'inactive';
      ondataavailable: ((e: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      timeslice: number | undefined;
      requestDataCalls = 0;
      constructor(
        public stream: MediaStream,
        public options?: MediaRecorderOptions,
      ) {
        recorders.push(this);
      }
      start(timeslice?: number): void {
        this.timeslice = timeslice;
        this.state = 'recording';
      }
      stop(): void {
        this.state = 'inactive';
      }
      requestData(): void {
        this.requestDataCalls += 1;
      }
      /** Delivers a data chunk of the given byte length to the service. */
      emitChunk(bytes: number): void {
        // Structural cast: the service only reads `data` off the event.
        this.ondataavailable?.({ data: new Blob([new Uint8Array(bytes)]) } as BlobEvent);
      }
      /** Fires the runtime encoder-failure event. */
      emitError(): void {
        this.onerror?.(new Event('error'));
      }
      /** Fires the finalization event (as the browser does after stop()). */
      emitStop(): void {
        this.onstop?.();
      }
    }

    /** Starts a recording the way production does: state first, then start. */
    function startRecordingAsApp(): void {
      service.recordingState.set('recording');
      service.startRecording(canvas);
    }

    beforeEach(() => {
      recorders = [];
      isTypeSupported = () => true;
      originalMediaRecorder = window.MediaRecorder;
      // Test double swap: the fake matches the constructor/static surface the
      // service touches, so the structural cast is safe here.
      window.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder;
      canvas = document.createElement('canvas');
      spyOn(canvas, 'captureStream').and.returnValue(new MediaStream());
    });

    afterEach(() => {
      // Stops the fake recorder and clears all recording timers.
      service.stopRecording();
      service.ngOnDestroy();
      window.MediaRecorder = originalMediaRecorder;
    });

    it('should request the minimum sufficient H.264 level for the format (L4.2 for reels@60)', () => {
      service.startRecording(canvas);

      expect(recorders[0].options?.mimeType).toBe('video/mp4;codecs=avc1.64002A');
    });

    it('should request Level 5.2 only for 4K@60 output', () => {
      service.currentFormat.set('youtube-4k');

      service.startRecording(canvas);

      expect(recorders[0].options?.mimeType).toBe('video/mp4;codecs=avc1.640034');
    });

    it('should walk the codec ladder down to VP9 WebM when MP4 is unavailable', () => {
      isTypeSupported = (type) => type === 'video/webm;codecs=vp9';

      service.startRecording(canvas);

      expect(recorders[0].options?.mimeType).toBe('video/webm;codecs=vp9');
    });

    it('should surface an error instead of recording when nothing is supported', () => {
      spyOn(console, 'error');
      isTypeSupported = () => false;
      service.recordingState.set('recording');

      service.startRecording(canvas);

      expect(recorders.length).toBe(0);
      expect(service.recordingState()).toBe('idle');
      expect(service.recordingError()).not.toBeNull();
    });

    it('should pass the preset bitrate and timeslice to the recorder', () => {
      service.startRecording(canvas);

      expect(recorders[0].options?.videoBitsPerSecond).toBe(service.recordingBitsPerSecond());
      expect(recorders[0].options?.videoBitsPerSecond).toBe(12_441_600);
      expect(recorders[0].timeslice).toBe(1000);
    });

    it('should capture the canvas at the preset frame rate', () => {
      service.startRecording(canvas);
      expect(canvas.captureStream).toHaveBeenCalledWith(60);

      service.stopRecording();
      service.recordingPreset.set('compact');
      service.startRecording(canvas);
      expect(canvas.captureStream).toHaveBeenCalledWith(30);
    });

    it('should surface an error and go idle when codec detection throws', () => {
      spyOn(console, 'error');
      isTypeSupported = () => {
        throw new Error('boom');
      };
      service.recordingState.set('recording');

      service.startRecording(canvas);

      expect(service.recordingState()).toBe('idle');
      expect(service.recordingError()).not.toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    describe('runtime codec fallback', () => {
      it('should retry on the next rung when the encoder errors at runtime', () => {
        startRecordingAsApp();
        expect(recorders.length).toBe(1);

        recorders[0].emitError();

        expect(recorders.length).toBe(2);
        expect(recorders[1].options?.mimeType).toBe('video/mp4;codecs=avc1.4D402A');
        expect(service.recordingState()).toBe('recording');
      });

      it('should blacklist a failed codec for subsequent recordings', () => {
        startRecordingAsApp();
        recorders[0].emitError();

        // Finish the fallback recording cleanly.
        recorders[1].emitChunk(64);
        service.stopRecording();
        recorders[1].emitStop();

        // The next recording skips the blacklisted High-profile rung entirely.
        startRecordingAsApp();
        expect(recorders[2].options?.mimeType).toBe('video/mp4;codecs=avc1.4D402A');
      });

      it('should fall back via the watchdog when no data ever arrives', fakeAsync(() => {
        startRecordingAsApp();

        tick(2500);

        expect(recorders.length).toBe(2);
        expect(service.recordingState()).toBe('recording');
        service.stopRecording(); // cancel the fallback attempt's pending timers
        discardPeriodicTasks();
      }));

      it('should NOT fall back when a chunk arrived before the watchdog', fakeAsync(() => {
        startRecordingAsApp();
        recorders[0].emitChunk(64);

        tick(2500);

        expect(recorders.length).toBe(1);
        service.stopRecording();
        discardPeriodicTasks();
      }));

      it('should nudge the recorder with requestData before the watchdog fires', fakeAsync(() => {
        startRecordingAsApp();

        tick(1200);

        expect(recorders[0].requestDataCalls).toBe(1);
        service.stopRecording(); // cancel the watchdog + auto-stop before leaving fakeAsync
        discardPeriodicTasks();
      }));

      it('should give up visibly when every rung fails', () => {
        spyOn(console, 'error');
        startRecordingAsApp();
        // Exhaust the whole 6-rung ladder.
        for (let i = 0; i < 6; i++) {
          recorders[i].emitError();
        }

        expect(recorders.length).toBe(6);
        expect(service.recordingState()).toBe('idle');
        expect(service.recordingError()).not.toBeNull();
      });

      it('should not fall back after the user stopped the recording', fakeAsync(() => {
        startRecordingAsApp();
        service.recordingState.set('idle');
        service.stopRecording();

        tick(2500);

        expect(recorders.length).toBe(1);
      }));

      it('should request an animation restart on fallback when recording from beginning', () => {
        service.recordFromBeginning.set(true);
        startRecordingAsApp();
        service.restartAnimationRequested.set(false);

        recorders[0].emitError();

        expect(service.restartAnimationRequested()).toBe(true);
      });
    });

    describe('finalization and download', () => {
      let createdUrls: string[];
      let revokedUrls: string[];
      let clickedAnchors: HTMLAnchorElement[];

      beforeEach(() => {
        createdUrls = [];
        revokedUrls = [];
        clickedAnchors = [];
        spyOn(URL, 'createObjectURL').and.callFake(() => {
          const url = `blob:fake-${createdUrls.length}`;
          createdUrls.push(url);
          return url;
        });
        spyOn(URL, 'revokeObjectURL').and.callFake((url: string) => {
          revokedUrls.push(url);
        });
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
          clickedAnchors.push(this);
        });
      });

      function recordOnce(bytes: number): void {
        startRecordingAsApp();
        const recorder = recorders[recorders.length - 1];
        if (bytes > 0) {
          recorder.emitChunk(bytes);
        }
        service.stopRecording();
        recorder.emitStop();
      }

      it('should download via a DOM-attached anchor without revoking the URL', () => {
        recordOnce(2_000_000);

        expect(createdUrls.length).toBe(1);
        expect(clickedAnchors.length).toBe(1);
        expect(revokedUrls.length).toBe(0); // deferred — crbug 827932
        expect(service.recordingState()).toBe('idle');
      });

      it('should revoke the previous download URL when the next recording starts', () => {
        recordOnce(2_000_000);

        startRecordingAsApp();

        expect(revokedUrls).toEqual(['blob:fake-0']);
      });

      it('should revoke the pending URL on service destroy', () => {
        recordOnce(2_000_000);

        service.ngOnDestroy();

        expect(revokedUrls).toEqual(['blob:fake-0']);
      });

      it('should retain the finished recording for re-saving', () => {
        recordOnce(2_000_000);

        const last = service.lastRecording();
        expect(last).not.toBeNull();
        expect(last?.filename).toBe('starfield_starwizz_9_16_1080_1920.mp4');
        expect(last?.sizeMb).toBe(2);
      });

      it('should surface an error and skip the download for an empty recording', () => {
        spyOn(console, 'error');

        recordOnce(0);

        expect(createdUrls.length).toBe(0);
        expect(clickedAnchors.length).toBe(0);
        expect(service.recordingError()).not.toBeNull();
        expect(service.lastRecording()).toBeNull();
        expect(trackVideoGeneration).not.toHaveBeenCalled();
      });

      it('should track the video generation exactly as before on success', () => {
        recordOnce(2_000_000);

        expect(trackVideoGeneration).toHaveBeenCalledWith('starwizz-user', 'mp4');
      });

      it('should re-download the retained recording on saveLastRecording', () => {
        recordOnce(2_000_000);

        service.saveLastRecording();

        expect(createdUrls.length).toBe(2);
        expect(clickedAnchors.length).toBe(2);
        // The first (pending) URL is released when the re-save mints a new one.
        expect(revokedUrls).toEqual(['blob:fake-0']);
      });

      it('should clear the retained recording on clearImage', () => {
        recordOnce(2_000_000);

        service.clearImage();

        expect(service.lastRecording()).toBeNull();
      });
    });
  });
});
