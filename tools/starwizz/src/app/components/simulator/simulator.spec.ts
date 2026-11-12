import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

import { GALAXY_PAN_FACTOR, LATERAL_TRAVEL_FRACTION } from '../../constants/simulation.constant';
import { ShootingStar } from '../../models/shooting-star.model';
import { TravelDirection } from '../../models/simulation.model';
import { Star } from '../../models/star.model';
import { SimulationService } from '../../services/simulation.service';
import { Simulator } from './simulator';

/** Dispatches a real PointerEvent on the canvas, exercising the host bindings. */
function dispatchPointer(
  canvas: HTMLCanvasElement,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
): void {
  canvas.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true }));
}

describe('Simulator', () => {
  let component: Simulator;
  let fixture: ComponentFixture<Simulator>;
  let simService: SimulationService;
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Simulator],
      providers: [{ provide: AnalyticsService, useValue: {} }],
    }).compileComponents();

    fixture = TestBed.createComponent(Simulator);
    component = fixture.componentInstance;
    simService = TestBed.inject(SimulationService);
    fixture.detectChanges();

    canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    // Synthetic pointers aren't "active", so a real setPointerCapture would throw.
    spyOn(canvas, 'setPointerCapture');
  });

  /** Puts the simulator into Custom Path authoring mode (pre "Set Path"). */
  function enterPathAuthoring(): void {
    simService.travelDirection.set('path');
    simService.pathFinalized.set(false);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should zoom in when two fingers pinch apart while authoring a custom path', () => {
    enterPathAuthoring();
    simService.liveCamera.set({ panX: 0, panY: 0, scale: 2 });

    dispatchPointer(canvas, 'pointerdown', 1, 100, 100);
    dispatchPointer(canvas, 'pointerdown', 2, 200, 100); // initial spread = 100px
    dispatchPointer(canvas, 'pointermove', 2, 300, 100); // spread doubles to 200px

    expect(simService.liveCamera().scale).toBeCloseTo(4, 5);
  });

  it('should zoom out when two fingers pinch together while authoring a custom path', () => {
    enterPathAuthoring();
    simService.liveCamera.set({ panX: 0, panY: 0, scale: 4 });

    dispatchPointer(canvas, 'pointerdown', 1, 100, 100);
    dispatchPointer(canvas, 'pointerdown', 2, 300, 100); // initial spread = 200px
    dispatchPointer(canvas, 'pointermove', 2, 200, 100); // spread halves to 100px

    expect(simService.liveCamera().scale).toBeCloseTo(2, 5);
  });

  it('should clamp pinch zoom to the maximum zoom', () => {
    enterPathAuthoring();
    simService.liveCamera.set({ panX: 0, panY: 0, scale: 2 });

    dispatchPointer(canvas, 'pointerdown', 1, 100, 100);
    dispatchPointer(canvas, 'pointerdown', 2, 200, 100); // spread = 100px
    dispatchPointer(canvas, 'pointermove', 2, 2100, 100); // spread x20 → 40, clamped to 5

    expect(simService.liveCamera().scale).toBe(5);
  });

  it('should not zoom on pinch when not authoring a custom path', () => {
    simService.travelDirection.set('forward');
    simService.liveCamera.set({ panX: 0, panY: 0, scale: 2 });

    dispatchPointer(canvas, 'pointerdown', 1, 100, 100);
    dispatchPointer(canvas, 'pointerdown', 2, 200, 100);
    dispatchPointer(canvas, 'pointermove', 2, 400, 100);

    expect(simService.liveCamera().scale).toBe(2);
  });

  it('should resume single-finger panning after one finger lifts from a pinch', () => {
    enterPathAuthoring();
    simService.liveCamera.set({ panX: 0, panY: 0, scale: 2 });

    dispatchPointer(canvas, 'pointerdown', 1, 100, 100);
    dispatchPointer(canvas, 'pointerdown', 2, 200, 100);
    dispatchPointer(canvas, 'pointerup', 2, 200, 100); // lift second finger

    expect(component['isDragging']()).toBe(true);

    dispatchPointer(canvas, 'pointerup', 1, 100, 100); // lift last finger
    expect(component['isDragging']()).toBe(false);
  });

  it('should skip drawing background and shooting stars while the starfield is removed', () => {
    component['ctx'] = canvas.getContext('2d');
    simService.isImageLoaded.set(true);

    const star = jasmine.createSpyObj<Star>('Star', ['update', 'draw']);
    const shootingStar = jasmine.createSpyObj<ShootingStar>('ShootingStar', ['update', 'draw']);
    simService.stars.set([star]);
    simService.shootingStars.set([shootingStar]);

    simService.starsEnabled.set(false);
    component['drawStars']();

    expect(star.draw).not.toHaveBeenCalled();
    expect(shootingStar.draw).not.toHaveBeenCalled();

    // Re-enabling the starfield resumes both the background stars and shooting stars.
    simService.starsEnabled.set(true);
    component['drawStars']();

    expect(star.draw).toHaveBeenCalled();
    expect(shootingStar.draw).toHaveBeenCalled();
  });

  describe('sideways travel background', () => {
    /** Loads a real 16:9 backdrop so the 9:16 frame is height-fitted (no spare image vertically). */
    async function loadLandscapeBackdrop(): Promise<void> {
      const source = document.createElement('canvas');
      source.width = 160;
      source.height = 90;
      const image = new Image();
      image.src = source.toDataURL();
      await image.decode();

      simService.galaxyImage.set(image);
      simService.isImageLoaded.set(true);
    }

    /** Selects a travel direction and lets the simulator react to it. */
    function selectDirection(direction: TravelDirection): void {
      simService.updateDirection(direction);
      fixture.detectChanges();
    }

    /** Advances the simulation by a number of animation frames. */
    function runFrames(count: number): void {
      for (let i = 0; i < count; i++) {
        component['updateGlobalState']();
      }
    }

    beforeEach(async () => {
      await loadLandscapeBackdrop();
    });

    it('should zoom the background in when the image has no room to move in the chosen direction', () => {
      selectDirection('up');

      expect(component['currentScale']).toBeCloseTo(1 + LATERAL_TRAVEL_FRACTION, 6);
    });

    it('should not zoom the background when the image already has room to move', () => {
      selectDirection('left');

      expect(component['currentScale']).toBe(1);
    });

    it('should move the background in the chosen direction on every frame', () => {
      const axisOf = { left: 'panX', right: 'panX', up: 'panY', down: 'panY' } as const;
      const signOf = { left: -1, right: 1, up: -1, down: 1 } as const;

      for (const direction of ['left', 'right', 'up', 'down'] as const) {
        selectDirection(direction);
        const before = component[axisOf[direction]];
        runFrames(10);
        const moved = component[axisOf[direction]] - before;

        expect(Math.sign(moved)).withContext(direction).toBe(signOf[direction]);
      }
    });

    it('should move the background faster when Star Speed is raised', () => {
      selectDirection('down');
      const start = component['panY'];
      runFrames(10);
      const slow = component['panY'] - start;

      selectDirection('up');
      simService.updateControl('starSpeed', simService.controls.starSpeed() * 2);
      selectDirection('down');
      runFrames(10);
      const fast = component['panY'] - start;

      expect(fast).toBeCloseTo(slow * 2, 6);
    });

    it('should loop back to the starting frame once the background reaches the far edge', () => {
      selectDirection('down');
      const start = component['panY'];

      // Run past one full loop: the background must be back near its start, not stuck at the end.
      const stepPerFrame = simService.getInternalValue('starSpeed') * GALAXY_PAN_FACTOR;
      const framesPerLoop = Math.ceil((component['height'] * LATERAL_TRAVEL_FRACTION) / stepPerFrame);
      runFrames(framesPerLoop - 1);
      const nearEnd = component['panY'];
      runFrames(3);

      expect(nearEnd).toBeGreaterThan(start);
      expect(component['panY']).toBeLessThan(0);
      expect(component['panY'] - start).toBeLessThan(nearEnd - start);
    });

    it('should return to the starting frame when the animation is restarted', () => {
      selectDirection('right');
      const start = component['panX'];
      runFrames(50);
      expect(component['panX']).not.toBeCloseTo(start, 3);

      simService.restartAnimationRequested.set(true);
      fixture.detectChanges();

      expect(component['panX']).toBeCloseTo(start, 6);
    });

    it('should recentre the background when switching back to Forward', () => {
      selectDirection('left');
      runFrames(5);
      expect(component['panX']).not.toBe(0);

      selectDirection('forward');

      expect(component['panX']).toBe(0);
      expect(component['panY']).toBe(0);
      expect(component['currentScale']).toBe(1);
    });

    it('should keep the background still and flat while it glides sideways', () => {
      selectDirection('forward');
      runFrames(20);
      expect(component['currentRotation']).not.toBe(0);

      selectDirection('up');
      runFrames(20);

      expect(component['currentRotation']).toBe(0);
      expect(component['panX']).toBeCloseTo(0, 6);
    });
  });
});
