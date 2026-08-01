import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DetectedStar } from '../../models/detected-star.model';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { StarControls } from './star-controls';

/** Builds a detected star with the given id. */
function makeStar(id: number): DetectedStar {
  return {
    id,
    x: 10 * id,
    y: 20 * id,
    flux: 100 - id,
    peak: 5,
    area: 6,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  };
}

describe('StarControls', () => {
  let fixture: ComponentFixture<StarControls>;
  let editor: SpikeEditorService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StarControls],
      providers: [
        {
          provide: ImageLoadService,
          useValue: jasmine.createSpyObj<ImageLoadService>('ImageLoadService', ['loadImageFile']),
        },
        {
          provide: StarDetectionService,
          useValue: jasmine.createSpyObj<StarDetectionService>('StarDetectionService', ['detect']),
        },
        {
          provide: SpikeExportService,
          useValue: jasmine.createSpyObj<SpikeExportService>('SpikeExportService', ['exportImage']),
        },
        {
          provide: AnalyticsService,
          useValue: jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackEvent']),
        },
      ],
    });
    await TestBed.compileComponents();
    editor = TestBed.inject(SpikeEditorService);
    editor.allStars.set([makeStar(0), makeStar(1), makeStar(2)]);
    fixture = TestBed.createComponent(StarControls);
    fixture.componentRef.setInput('starId', 1);
    fixture.detectChanges();
  });

  /** All range inputs inside the panel, in template order. */
  function sliders(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="range"]'));
  }

  /** Finds an action in the bar by its visible label. */
  function action(label: string): HTMLButtonElement {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.star-bar__actions button'),
    );
    const match = buttons.find(
      (button) => button.textContent?.trim().toLowerCase() === label.toLowerCase(),
    );
    if (match === undefined) {
      throw new Error(`${label} action not rendered`);
    }
    return match;
  }

  /** Drives a range input the way a user drag would. */
  function setSlider(input: HTMLInputElement, value: number): void {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('should name the star it is adjusting', () => {
    const panel: HTMLElement | null = fixture.nativeElement.querySelector('section.star-bar');
    expect(panel?.getAttribute('aria-label')).toBe('Star #2 spike controls');
    expect(fixture.nativeElement.textContent).toContain('Star #2');
  });

  it('should start neutral so an untouched star follows the global controls', () => {
    expect(editor.starAdjustments().has(1)).toBeFalse();
    expect(editor.adjustmentFor(1)).toEqual({
      lengthFactor: 1,
      intensityFactor: 1,
      rotationDeg: 0,
      diffusion: null,
    });
  });

  it('should apply length, brightness, and rotation to that star only', () => {
    const [length, brightness, rotation] = sliders();
    setSlider(length, 2);
    setSlider(brightness, 1.5);
    setSlider(rotation, 30);

    expect(editor.adjustmentFor(1)).toEqual({
      lengthFactor: 2,
      intensityFactor: 1.5,
      rotationDeg: 30,
      diffusion: null,
    });
    // Neighbours are untouched.
    expect(editor.starAdjustments().has(0)).toBeFalse();
    expect(editor.starAdjustments().has(2)).toBeFalse();
  });

  it('should drop the entry when the sliders return to neutral', () => {
    const [length] = sliders();
    setSlider(length, 2);
    expect(editor.starAdjustments().has(1)).toBeTrue();

    setSlider(length, 1);

    expect(editor.starAdjustments().has(1)).toBeFalse();
  });

  it('should enable reset only once the star carries a tweak', () => {
    expect(action('Reset star').disabled).toBeTrue();

    setSlider(sliders()[0], 2);
    fixture.detectChanges();
    expect(action('Reset star').disabled).toBeFalse();

    action('Reset star').click();
    fixture.detectChanges();

    expect(editor.starAdjustments().has(1)).toBeFalse();
    expect(action('Reset star').disabled).toBeTrue();
  });

  it('should offer to remove the spikes of a star that has them', () => {
    // Two of the three stars are inside the default cut, so star #2 is spiked.
    expect(editor.renderedStars().map((star) => star.id)).toContain(1);

    action('Remove spikes').click();
    fixture.detectChanges();

    expect(editor.renderedStars().map((star) => star.id)).not.toContain(1);
  });

  it('should offer to add the spikes back once the star has none', () => {
    action('Remove spikes').click();
    fixture.detectChanges();

    action('Add spikes').click();
    fixture.detectChanges();

    expect(editor.renderedStars().map((star) => star.id)).toContain(1);
    expect(action('Remove spikes')).toBeTruthy();
  });

  it('should stay open after toggling the spikes so tuning can continue', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    action('Remove spikes').click();

    expect(closed).toBe(0);
  });

  it('should show the global diffusion until this star pins its own', () => {
    editor.updateControl('diffusion', 0.4);
    fixture.detectChanges();

    const row: HTMLElement = fixture.nativeElement.querySelectorAll('.star-bar__field')[3];
    expect(row.textContent).toContain('Diffusion');
    expect(row.textContent).toContain('0.4');
    // Marked as inherited, so it is clear the star is not pinned yet.
    expect(row.textContent).toContain('following global');
    expect(editor.starAdjustments().has(1)).toBeFalse();
  });

  it('should pin this star diffusion without touching its neighbours', () => {
    // The global control stays at zero: an absolute value is the only way one
    // star can bloom on its own.
    expect(editor.controls.diffusion()).toBe(0);

    setSlider(sliders()[3], 0.75);
    fixture.detectChanges();

    expect(editor.adjustmentFor(1).diffusion).toBe(0.75);
    expect(editor.starAdjustments().has(0)).toBeFalse();
    expect(editor.starAdjustments().has(2)).toBeFalse();
    const row: HTMLElement = fixture.nativeElement.querySelectorAll('.star-bar__field')[3];
    expect(row.textContent).toContain('this star only');
  });

  it('should keep a pinned zero while the global amount is high', () => {
    editor.updateControl('diffusion', 1);
    fixture.detectChanges();

    setSlider(sliders()[3], 0);

    expect(editor.adjustmentFor(1).diffusion).toBe(0);
    expect(editor.starAdjustments().has(1)).toBeTrue();
  });

  it('should offer four per-star fields in the bar', () => {
    expect(sliders().length).toBe(4);
    const keys: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.star-bar__key'),
    ).map((el) => (el as HTMLElement).textContent?.trim() ?? '');
    expect(keys).toEqual(['Length', 'Brightness', 'Rotation', 'Diffusion']);
  });

  it('should name the star and where it sits', () => {
    expect(fixture.nativeElement.querySelector('.star-bar__coords').textContent).toContain('x 10');
  });

  it('should read a tweak as a signed delta with the resulting total', () => {
    setSlider(sliders()[0], 1.4);
    fixture.detectChanges();

    const field: HTMLElement = fixture.nativeElement.querySelectorAll('.star-bar__field')[0];
    expect(field.querySelector('.star-bar__delta')?.textContent?.trim()).toBe('+0.4×');
    expect(field.querySelector('.star-bar__total')?.textContent).toContain('1.4× total');
  });

  it('should emit closed from the deselect action', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    const deselect: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[title="Deselect star"]',
    );
    deselect?.click();

    expect(closed).toBe(1);
  });

  describe('diffusion mode', () => {
    it('should trim the bar to the diffusion field, the arm tweaks being dead at zero length', () => {
      editor.applyPreset('diffusion');
      fixture.detectChanges();

      const keys = Array.from(
        fixture.nativeElement.querySelectorAll('.star-bar__key') as NodeListOf<HTMLElement>,
      ).map((el) => el.textContent?.trim());
      expect(keys).toEqual(['Diffusion']);
    });

    it('should name the include toggle after the bloom instead of the spikes', () => {
      editor.applyPreset('diffusion');
      fixture.detectChanges();

      const labels = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).map((button) => button.textContent?.trim());
      expect(labels).toContain('Remove bloom');
      expect(labels).not.toContain('Remove spikes');
    });
  });
});
