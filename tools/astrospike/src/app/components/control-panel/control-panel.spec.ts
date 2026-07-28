import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DetectedStar } from '../../models/detected-star.model';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { ControlPanel } from './control-panel';

/** Builds a small real ImageBitmap to drive the editor's hasImage state. */
async function buildBitmap(width: number, height: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('spec canvas has no 2d context');
  }
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, width, height);
  return createImageBitmap(canvas);
}

/** Builds `count` placeholder detected stars for the star-count readout. */
function buildStars(count: number): readonly DetectedStar[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: index,
    x: index,
    y: index,
    flux: count - index,
    peak: 255,
    area: 4,
    elongation: 1,
    color: { r: 255, g: 255, b: 255 },
  }));
}

describe('ControlPanel', () => {
  let fixture: ComponentFixture<ControlPanel>;
  let editor: SpikeEditorService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ControlPanel],
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
    fixture = TestBed.createComponent(ControlPanel);
    fixture.detectChanges();
  });

  /** The four editor sliders, in rendered order (PNG hides the quality slider). */
  function sliders(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="range"]'));
  }

  function dragSlider(index: number, value: string): void {
    const slider = sliders()[index];
    slider.value = value;
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function sliderLabels(): string[] {
    const rows: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.slider-row .row-label');
    return Array.from(rows).map((row) => row.textContent?.trim() ?? '');
  }

  function presetCard(label: string): HTMLButtonElement {
    const cards: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button[role="radio"]');
    const match = Array.from(cards).find((card) => card.textContent?.includes(label));
    if (match === undefined) {
      throw new Error(`preset card "${label}" not rendered`);
    }
    return match;
  }

  function spikeCountTab(label: string): HTMLButtonElement {
    const tabs: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button[role="tab"]');
    const match = Array.from(tabs).find((tab) => tab.textContent?.includes(label));
    if (match === undefined) {
      throw new Error(`spike count tab "${label}" not rendered`);
    }
    return match;
  }

  it('should render the controls landmark with the empty hint when no image is loaded', () => {
    const section: HTMLElement | null = fixture.nativeElement.querySelector(
      'section[aria-label="AstroSpike controls"]',
    );
    expect(section).toBeTruthy();
    expect(section?.textContent).toContain('Load an image to begin.');
  });

  it('should show the image meta and star count once an image is loaded', async () => {
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    editor.allStars.set(buildStars(3));
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('m42.png');
    expect(text).toContain('6×4 px');
    expect(text).toContain('3 stars detected');
  });

  it('should report detection progress instead of a zero star count while detecting', async () => {
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    editor.isDetecting.set(true);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Detecting stars…');
    expect(text).not.toContain('0 stars detected');
  });

  it('should render the four editor sliders in order', () => {
    expect(sliderLabels()).toEqual(['Stars', 'Length', 'Brightness', 'Rotation']);
    expect(sliders().length).toBe(4);
  });

  it('should show the resolved star count as the stars readout', () => {
    editor.allStars.set(buildStars(68));
    dragSlider(0, '1');

    expect(fixture.nativeElement.textContent).toContain('68 of 68');
  });

  it('should update the length control and its readout when its slider is dragged', () => {
    dragSlider(1, '1.4');

    expect(editor.controls.length()).toBe(1.4);
    expect(fixture.nativeElement.textContent).toContain('1.4×');
  });

  it('should update the brightness control when its slider is dragged', () => {
    dragSlider(2, '1.5');

    expect(editor.controls.brightness()).toBe(1.5);
    expect(fixture.nativeElement.textContent).toContain('1.5×');
  });

  it('should update the rotation control in degrees when its slider is dragged', () => {
    dragSlider(3, '15');

    expect(editor.controls.rotation()).toBe(15);
    expect(fixture.nativeElement.textContent).toContain('15°');
  });

  it('should apply the preset behind a clicked card, including its default arm count', () => {
    presetCard('JWST').click();
    fixture.detectChanges();

    expect(editor.presetId()).toBe('jwst');
    expect(editor.spikeCount()).toBe(6);
    expect(presetCard('JWST').getAttribute('aria-checked')).toBe('true');
  });

  it('should set the arm count from the segmented toggle', () => {
    presetCard('JWST').click();
    fixture.detectChanges();

    spikeCountTab('4 spikes').click();
    fixture.detectChanges();

    expect(editor.spikeCount()).toBe(4);
    expect(spikeCountTab('4 spikes').getAttribute('aria-selected')).toBe('true');
  });

  it('should keep a manual arm-count override when other sliders change afterwards', () => {
    presetCard('JWST').click();
    fixture.detectChanges();
    spikeCountTab('4 spikes').click();
    fixture.detectChanges();

    dragSlider(1, '2');
    dragSlider(3, '30');

    expect(editor.spikeCount()).toBe(4);
    expect(editor.presetId()).toBe('jwst');
    expect(spikeCountTab('4 spikes').getAttribute('aria-selected')).toBe('true');
  });

  it('should surface the export error inside the panel', () => {
    editor.exportError.set('The export failed. Please try again.');
    fixture.detectChanges();

    const error: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error?.textContent).toContain('The export failed. Please try again.');
  });

});
