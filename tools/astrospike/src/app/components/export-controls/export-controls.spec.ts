import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { ExportResult } from '../../models/export-result.model';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { ExportControls } from './export-controls';

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

/** Builds a stub export result for the export service spy. */
function buildExportResult(filename: string, sizeBytes: number): ExportResult {
  return { blob: new Blob(['x']), filename, sizeBytes };
}

describe('ExportControls', () => {
  let fixture: ComponentFixture<ExportControls>;
  let editor: SpikeEditorService;
  let exportService: jasmine.SpyObj<SpikeExportService>;

  beforeEach(async () => {
    exportService = jasmine.createSpyObj<SpikeExportService>('SpikeExportService', ['exportImage']);
    TestBed.configureTestingModule({
      imports: [ExportControls],
      providers: [
        {
          provide: ImageLoadService,
          useValue: jasmine.createSpyObj<ImageLoadService>('ImageLoadService', ['loadImageFile']),
        },
        {
          provide: StarDetectionService,
          useValue: jasmine.createSpyObj<StarDetectionService>('StarDetectionService', ['detect']),
        },
        { provide: SpikeExportService, useValue: exportService },
        {
          provide: AnalyticsService,
          useValue: jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackEvent']),
        },
      ],
    });
    await TestBed.compileComponents();
    editor = TestBed.inject(SpikeEditorService);
    fixture = TestBed.createComponent(ExportControls);
    fixture.detectChanges();
  });

  /** Loads a ready-to-export image so renderParams resolves. */
  async function loadImage(): Promise<void> {
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    fixture.detectChanges();
  }

  function mainButton(): HTMLButtonElement {
    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'dba-ui-split-button button:not([aria-haspopup])',
    );
    if (button === null) {
      throw new Error('export button not rendered');
    }
    return button;
  }

  function openMenu(): void {
    const chevron: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[aria-haspopup="menu"]',
    );
    if (chevron === null) {
      throw new Error('export menu toggle not rendered');
    }
    chevron.click();
    fixture.detectChanges();
  }

  function menuItem(label: string): HTMLButtonElement {
    const items: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button[role="menuitemradio"]');
    const match = Array.from(items).find((item) => item.textContent?.includes(label));
    if (match === undefined) {
      throw new Error(`menu item "${label}" not rendered`);
    }
    return match;
  }

  function rangeInputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="range"]'));
  }

  it('should offer a disabled PNG export until an image is loaded', () => {
    const button = mainButton();
    expect(button.textContent).toContain('Export PNG');
    expect(button.disabled).toBeTrue();
  });

  it('should export with the current format when the main segment is clicked', async () => {
    exportService.exportImage.and.resolveTo(buildExportResult('m42_astrospike_6_4.png', 2048));
    await loadImage();

    mainButton().click();

    expect(exportService.exportImage).toHaveBeenCalledTimes(1);
    expect(exportService.exportImage.calls.mostRecent().args[2]).toBe('png');
    await fixture.whenStable();
  });

  it('should export with the newly chosen format when a menu entry is selected', async () => {
    exportService.exportImage.and.resolveTo(buildExportResult('m42_astrospike_6_4.jpg', 2048));
    await loadImage();

    openMenu();
    menuItem('Export JPEG').click();

    expect(exportService.exportImage).toHaveBeenCalledTimes(1);
    expect(exportService.exportImage.calls.mostRecent().args[2]).toBe('jpeg');
    expect(editor.exportFormat()).toBe('jpeg');
    await fixture.whenStable();
  });

  it('should switch the button label to the selected format', async () => {
    exportService.exportImage.and.resolveTo(buildExportResult('m42_astrospike_6_4.jpg', 2048));
    await loadImage();

    openMenu();
    menuItem('Export JPEG').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mainButton().textContent).toContain('Export JPEG');
  });

  it('should show a progress label and disable the button while exporting', async () => {
    await loadImage();
    editor.isExporting.set(true);
    fixture.detectChanges();

    const button = mainButton();
    expect(button.textContent).toContain('Exporting…');
    expect(button.disabled).toBeTrue();
  });

  it('should hide the quality slider while PNG is selected', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Quality');
    expect(rangeInputs().length).toBe(0);
  });

  it('should reveal the quality slider as a percentage when JPEG is selected', () => {
    editor.exportFormat.set('jpeg');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Quality');
    expect(fixture.nativeElement.textContent).toContain('92%');
    expect(rangeInputs().length).toBe(1);
  });

  it('should update the JPEG quality when the slider moves', () => {
    editor.exportFormat.set('jpeg');
    fixture.detectChanges();

    const slider = rangeInputs()[0];
    expect(slider.min).toBe('0.5');
    expect(slider.max).toBe('1');
    expect(slider.step).toBe('0.01');

    slider.value = '0.6';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(editor.jpegQuality()).toBe(0.6);
    expect(fixture.nativeElement.textContent).toContain('60%');
  });

  it('should surface the export error', () => {
    editor.exportError.set('The export failed. Please try again.');
    fixture.detectChanges();

    const error: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error?.textContent).toContain('The export failed. Please try again.');
  });

  it('should confirm the last export with its size', () => {
    // The footer is tight and the source file name already sits at the top of
    // the panel, so the confirmation carries the size only.
    editor.lastExport.set(buildExportResult('m42_astrospike_1600_1100.png', 4404019));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Saved · 4.2 MB');
  });

  it('should state that the export matches the source resolution', () => {
    editor.imageMeta.set({ fileName: 'm42.png', width: 1600, height: 1100 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1600 × 1100 px · same as source');
  });

});
