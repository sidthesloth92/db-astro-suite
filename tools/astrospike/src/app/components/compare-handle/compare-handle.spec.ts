import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompareHandle } from './compare-handle';

const TRACK_WIDTH = 200;

describe('CompareHandle', () => {
  let fixture: ComponentFixture<CompareHandle>;
  let divider: HTMLElement;
  let emitted: number[];

  /** Reads the divider's current bounding rect for client-coordinate math. */
  function trackRect(): DOMRect {
    return fixture.nativeElement.getBoundingClientRect();
  }

  /** Dispatches a pointer event on the divider at the given client x. */
  function pointer(type: string, clientX: number): void {
    divider.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, clientX, pointerId: 1 }),
    );
  }

  /** Dispatches a keydown on the divider. */
  function press(key: string): void {
    divider.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CompareHandle] });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(CompareHandle);

    // The host is the drag track — give it a known box so client x maps to a
    // predictable fraction.
    const host: HTMLElement = fixture.nativeElement;
    host.style.position = 'absolute';
    host.style.left = '0';
    host.style.top = '0';
    host.style.width = `${TRACK_WIDTH}px`;
    host.style.height = '100px';

    fixture.componentRef.setInput('position', 0.25);
    fixture.detectChanges();

    divider = fixture.nativeElement.querySelector('[role="slider"]');
    // Synthetic pointer events have no active pointer, so a real capture call
    // would throw NotFoundError.
    spyOn(divider, 'setPointerCapture');
    spyOn(divider, 'hasPointerCapture').and.returnValue(false);

    emitted = [];
    fixture.componentInstance.positionChange.subscribe((value) => emitted.push(value));
  });

  it('should render the divider at the bound position', () => {
    // Position is published as a 0-1 fraction; the stylesheet puts the line on
    // exactly that fraction (matching the stage's wipe seam) and clamps only
    // the round grip so it is never clipped at the extremes.
    expect(divider.style.getPropertyValue('--compare-pos')).toBe('0.25');

    fixture.componentRef.setInput('position', 0.8);
    fixture.detectChanges();

    expect(divider.style.getPropertyValue('--compare-pos')).toBe('0.8');
  });

  it('should clamp the published position into the unit range', () => {
    fixture.componentRef.setInput('position', 1.4);
    fixture.detectChanges();
    expect(divider.style.getPropertyValue('--compare-pos')).toBe('1');

    fixture.componentRef.setInput('position', -0.3);
    fixture.detectChanges();
    expect(divider.style.getPropertyValue('--compare-pos')).toBe('0');
  });

  it('should expose itself as a labelled slider reporting whole percent', () => {
    expect(divider.getAttribute('role')).toBe('slider');
    expect(divider.getAttribute('aria-label')).toBe('Before and after comparison');
    expect(divider.getAttribute('aria-valuemin')).toBe('0');
    expect(divider.getAttribute('aria-valuemax')).toBe('100');
    expect(divider.getAttribute('aria-valuenow')).toBe('25');
    expect(divider.getAttribute('tabindex')).toBe('0');
  });

  it('should update the reported value as the position changes', () => {
    fixture.componentRef.setInput('position', 0.666);
    fixture.detectChanges();

    expect(divider.getAttribute('aria-valuenow')).toBe('67');
  });

  it('should emit the dragged position as a fraction of the track', () => {
    const rect = trackRect();

    pointer('pointerdown', rect.left + TRACK_WIDTH / 2);
    pointer('pointermove', rect.left + TRACK_WIDTH * 0.75);

    expect(emitted.length).toBe(2);
    expect(emitted[0]).toBeCloseTo(0.5, 5);
    expect(emitted[1]).toBeCloseTo(0.75, 5);
  });

  it('should clamp a drag that leaves the track to the 0-1 range', () => {
    const rect = trackRect();

    pointer('pointerdown', rect.left + 20);
    pointer('pointermove', rect.left - 500);
    pointer('pointermove', rect.left + TRACK_WIDTH + 500);

    expect(emitted[1]).toBe(0);
    expect(emitted[2]).toBe(1);
  });

  it('should stop tracking the pointer once the drag ends', () => {
    const rect = trackRect();

    pointer('pointerdown', rect.left + 20);
    pointer('pointerup', rect.left + 20);
    emitted.length = 0;
    pointer('pointermove', rect.left + 180);

    expect(emitted).toEqual([]);
  });

  it('should stop tracking the pointer when the drag is cancelled', () => {
    const rect = trackRect();

    pointer('pointerdown', rect.left + 20);
    pointer('pointercancel', rect.left + 20);
    emitted.length = 0;
    pointer('pointermove', rect.left + 180);

    expect(emitted).toEqual([]);
  });

  it('should ignore a pointer move before any drag has started', () => {
    pointer('pointermove', trackRect().left + 100);

    expect(emitted).toEqual([]);
  });

  it('should nudge right by two percent on ArrowRight', () => {
    press('ArrowRight');

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBeCloseTo(0.27, 5);
  });

  it('should nudge left by two percent on ArrowLeft', () => {
    press('ArrowLeft');

    expect(emitted[0]).toBeCloseTo(0.23, 5);
  });

  it('should clamp keyboard nudges at the ends of the track', () => {
    fixture.componentRef.setInput('position', 0);
    fixture.detectChanges();
    press('ArrowLeft');

    fixture.componentRef.setInput('position', 1);
    fixture.detectChanges();
    press('ArrowRight');

    expect(emitted).toEqual([0, 1]);
  });

  it('should jump to the ends of the track on Home and End', () => {
    press('Home');
    press('End');

    expect(emitted).toEqual([0, 1]);
  });

  it('should leave other keys to the browser', () => {
    press('Enter');
    press('a');

    expect(emitted).toEqual([]);
  });
});
