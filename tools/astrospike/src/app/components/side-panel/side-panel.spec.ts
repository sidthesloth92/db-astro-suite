import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { SidePanel } from './side-panel';

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

describe('SidePanel', () => {
  let fixture: ComponentFixture<SidePanel>;
  let editor: SpikeEditorService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SidePanel],
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
    fixture = TestBed.createComponent(SidePanel);
    fixture.detectChanges();
  });

  function exportButton(): HTMLButtonElement {
    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button.text-button');
    const match = Array.from(buttons).find((button) => button.textContent?.includes('Export'));
    if (match === undefined) {
      throw new Error('export button not rendered');
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

  it('should disable the export button while no image is loaded', () => {
    expect(exportButton().disabled).toBeTrue();
  });

  it('should show the image meta and star count once an image is loaded', async () => {
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    editor.allStars.set([]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('m42.png');
    expect(text).toContain('6×4 px');
    expect(text).toContain('0 stars detected');
  });

  it('should report detection progress instead of a zero star count while detecting', async () => {
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    editor.allStars.set([]);
    editor.isDetecting.set(true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Detecting stars…');
    expect(text).not.toContain('0 stars detected');
  });

  it('should call exportCurrent when the enabled export button is clicked', async () => {
    const exportSpy = spyOn(editor, 'exportCurrent').and.resolveTo();
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    fixture.detectChanges();

    const button = exportButton();
    expect(button.disabled).toBeFalse();
    button.click();

    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('should switch the export label and disable the button while exporting', async () => {
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    editor.isExporting.set(true);
    fixture.detectChanges();

    const button = exportButton();
    expect(button.textContent).toContain('Exporting…');
    expect(button.disabled).toBeTrue();
  });

  it('should surface the export error line', () => {
    editor.exportError.set('The export failed. Please try again.');
    fixture.detectChanges();

    const error: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error?.textContent).toContain('The export failed. Please try again.');
  });

  it('should clear the image when the New image button is clicked', async () => {
    const clearSpy = spyOn(editor, 'clearImage');
    editor.sourceImage.set(await buildBitmap(6, 4));
    editor.imageMeta.set({ fileName: 'm42.png', width: 6, height: 4 });
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button.text-button');
    const newImage = Array.from(buttons).find((button) =>
      button.textContent?.includes('New image'),
    );
    if (newImage === undefined) {
      throw new Error('New image button not rendered');
    }
    newImage.click();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
