import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

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
});
