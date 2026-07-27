import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { ImageLoadService } from '../../services/image-load.service';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { SpikeExportService } from '../../services/spike-export.service';
import { StarDetectionService } from '../../services/star-detection.service';
import { SpikeStage } from './spike-stage';

describe('SpikeStage', () => {
  let fixture: ComponentFixture<SpikeStage>;
  let editor: SpikeEditorService;
  let loadSpy: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SpikeStage],
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
    loadSpy = spyOn(editor, 'loadImage').and.resolveTo();
    fixture = TestBed.createComponent(SpikeStage);
    fixture.detectChanges();
  });

  it('should create with the preview canvas in place', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('canvas.after-canvas')).toBeTruthy();
  });

  it('should show the dropzone when no image is loaded', () => {
    expect(fixture.nativeElement.querySelector('dba-as-image-dropzone')).toBeTruthy();
  });

  it('should show the loader with a status line while detecting stars', () => {
    editor.isDetecting.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('dba-as-image-dropzone')).toBeNull();
    const overlay: HTMLElement | null = fixture.nativeElement.querySelector('[role="status"]');
    expect(overlay?.textContent).toContain('Detecting stars…');
  });

  it('should show the error banner instead of the dropzone on an image error', () => {
    editor.imageError.set('The image could not be loaded. Please try a different file.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('dba-as-image-dropzone')).toBeNull();
    const alert: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('The image could not be loaded.');
  });

  it('should clear the editor when Try another image is clicked', () => {
    const clearSpy = spyOn(editor, 'clearImage');
    editor.imageError.set('boom');
    fixture.detectChanges();

    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[role="alert"] button');
    expect(button).toBeTruthy();
    button?.click();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should load a file dropped anywhere on the stage', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['x'], 'm31.png', { type: 'image/png' }));
    const stage: HTMLElement | null = fixture.nativeElement.querySelector('.stage');
    if (stage === null) {
      throw new Error('stage element not rendered');
    }

    stage.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
    );

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect((loadSpy.calls.mostRecent().args[0] as File).name).toBe('m31.png');
  });

  it('should forward a file picked in the dropzone to the editor', () => {
    const dropzone = fixture.nativeElement.querySelector('dba-as-image-dropzone .dropzone');
    if (dropzone === null) {
      throw new Error('dropzone not rendered');
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['x'], 'orion.png', { type: 'image/png' }));

    dropzone.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
    );

    // The dropzone stops propagation, so the stage handler must not double-load.
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect((loadSpy.calls.mostRecent().args[0] as File).name).toBe('orion.png');
  });
});
