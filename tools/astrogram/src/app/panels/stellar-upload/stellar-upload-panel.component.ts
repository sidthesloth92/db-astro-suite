import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  OnDestroy,
  OnInit,
  computed,
  createComponent,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AnalyticsService,
  ConstellationLoaderComponent,
} from '@db-astro-suite/ui';
import {
  ASTROGRAM_USER_ID,
  PLATE_SOLVE_ERROR_ACCESS_KEY,
} from '../../constants/analytics.constants';
import { AccessKeyModalComponent } from '../../components/access-key-modal/access-key-modal.component';
import type { ImageAnnotation } from '../../models/annotation.models';
import type { StellarMapData } from '../../models/card-data.model';
import { AstrosolveService } from '../../services/astrosolve.service';
import { CardDataService } from '../../services/card-data.service';
import { AccessKeyError } from '../../services/models/access-key.error';
import { WcsService } from '../../services/wcs.service';

/**
 * Overlay panel surfaced on the stellar-map preview when no background
 * image is uploaded. Owns the upload card, the Solve CTA, the access
 * key modal mount, and the plate-solve → annotation pipeline. Reuses
 * `AstrosolveService` + `AccessKeyModalComponent` unchanged.
 */
@Component({
  selector: 'dba-ag-stellar-upload-panel',
  standalone: true,
  imports: [ConstellationLoaderComponent],
  templateUrl: './stellar-upload-panel.component.html',
  styleUrls: ['./stellar-upload-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StellarUploadPanelComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly dataService = inject(CardDataService);
  private readonly astrosolveService = inject(AstrosolveService);
  private readonly wcsService = inject(WcsService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  /** Reactive stellar-map document. */
  readonly mapData = this.dataService.stellarMapData;

  /** True once Solve is in flight, false otherwise. */
  readonly isSolving = signal(false);
  /** Human-readable status line below the upload card. */
  readonly solveStatus = signal('');
  /** Inline pre-upload validation error (e.g. file too large / bad type). */
  readonly uploadError = signal('');
  /** Compact "JPG/PNG · max 10 MB" hint pulled from /api/v1/limits. */
  readonly uploadLimitsHint = signal('');
  /** Surfaced when limits fail to load — rendered as a subtle hint. */
  readonly loadLimitsError = signal('');
  /** Mirror flag — true while the upload card should be shown. */
  readonly isEmpty = computed(() => this.mapData().backgroundImage === null);

  private modalRef: ComponentRef<AccessKeyModalComponent> | null = null;

  /** Hidden file input — clicked programmatically when the upload card is tapped. */
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  ngOnInit(): void {
    this.astrosolveService
      .loadLimits()
      .then((limits) => {
        this.uploadLimitsHint.set(this.astrosolveService.formatLimitsHint(limits));
      })
      .catch(() => {
        // Service already falls back to baked-in defaults; surface a subtle
        // hint so failures are observable in the UI rather than silenced.
        this.loadLimitsError.set('Could not load latest solve limits — using defaults.');
      });
  }

  ngOnDestroy(): void {
    this.destroyModal();
  }

  /** Opens the OS file picker by forwarding to the hidden input. */
  pickFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  /** Reads the picked file, validates it, then loads it into the stellar map document. */
  async onImageUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) {
      return;
    }
    const file = input.files[0];

    const validation = await this.astrosolveService.validateForUpload(file);
    if (!validation.ok) {
      this.uploadError.set(validation.reason);
      input.value = '';
      return;
    }
    this.uploadError.set('');
    if (validation.softWarning) {
      this.solveStatus.set(validation.softWarning);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.dataService.stellarMapData.update((d) => ({
          ...d,
          backgroundImage: result,
          rawFile: file,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        }));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Runs plate-solve on the uploaded image. Opens the access-key modal
   * when no key is present; on success, maps the returned objects to
   * `ImageAnnotation` records.
   */
  async triggerPlateSolve(pendingKey?: string): Promise<void> {
    const file = this.mapData().rawFile;
    if (!file) {
      this.solveStatus.set('Error: No image uploaded.');
      return;
    }

    if (!pendingKey && !this.astrosolveService.hasAccessKey()) {
      this.openAccessKeyModal(false);
      return;
    }

    this.analyticsService.trackPlateSolveInitiated(file.size, false);

    this.isSolving.set(true);
    this.dataService.stellarMapData.update((d) => ({ ...d, isSolving: true }));
    this.solveStatus.set('Starting plate solve...');

    try {
      const hints = {};
      const result = await this.astrosolveService.solveImage(
        file,
        hints,
        (msg: string) => this.solveStatus.set(msg),
        pendingKey,
      );

      if (pendingKey) {
        this.astrosolveService.saveAccessKey(pendingKey);
      }

      const nW = this.mapData().naturalWidth ?? 1080;
      const nH = this.mapData().naturalHeight ?? 1080;
      this.wcsService.initialize(result.metadata.wcs, nW, nH);

      const wcsW = this.wcsService.getImageWidth() || nW;
      const wcsH = this.wcsService.getImageHeight() || nH;
      const scaleArcsecPerPx = this.wcsService.getArcsecPerPixel();

      const annotations: ImageAnnotation[] = result.objects
        .map((obj) => {
          const pix = this.wcsService.skyToPix(obj.ra, obj.dec);
          const xPercent = pix ? (pix.x / wcsW) * 100 : 0;
          const yPercent = pix ? (pix.y / wcsH) * 100 : 0;

          let radiusDb = 8;
          if (obj.sizeArcmin && obj.sizeArcmin > 0 && scaleArcsecPerPx > 0) {
            const radiusPx = (obj.sizeArcmin * 60) / (2 * scaleArcsecPerPx);
            radiusDb = Math.max(8, Math.min(radiusPx, Math.min(wcsW, wcsH) * 0.25));
          }

          return {
            id: obj.entryId || obj.name,
            label: obj.commonName || obj.name,
            name: obj.name,
            commonName: obj.commonName,
            xPercent,
            yPercent,
            radiusDb,
            visible: pix !== null,
            source: obj.source,
            catalog: obj.catalog,
            type: obj.type,
            magnitude: obj.magnitude ?? undefined,
          };
        })
        .filter(
          (a) =>
            a.visible && a.xPercent >= 0 && a.xPercent <= 100 && a.yPercent >= 0 && a.yPercent <= 100,
        );

      this.dataService.stellarMapData.update((d: StellarMapData) => ({ ...d, annotations }));
      this.solveStatus.set(`Success! Identified ${annotations.length} objects.`);

      const toolsUsed = `plate-solve,wcs-projection,${annotations.length}-objects`;
      this.analyticsService.trackImageGeneration(ASTROGRAM_USER_ID, toolsUsed);
    } catch (err: unknown) {
      if (err instanceof AccessKeyError) {
        this.astrosolveService.clearAccessKey();
        this.analyticsService.trackPlateSolveFailed(PLATE_SOLVE_ERROR_ACCESS_KEY);
        this.solveStatus.set('');
        this.openAccessKeyModal(true);
        return;
      }
      if (pendingKey) {
        this.astrosolveService.saveAccessKey(pendingKey);
      }
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      this.analyticsService.trackPlateSolveFailed(message);
      this.solveStatus.set(`Error: ${message}`);
    } finally {
      this.isSolving.set(false);
      this.dataService.stellarMapData.update((d) => ({ ...d, isSolving: false }));
      if (!this.solveStatus().startsWith('Error')) {
        const handle = setTimeout(() => this.solveStatus.set(''), 5000);
        this.destroyRef.onDestroy(() => clearTimeout(handle));
      }
    }
  }

  /** Clears the uploaded image, file, and annotations. */
  resetMap(): void {
    this.dataService.stellarMapData.update((d) => ({
      ...d,
      backgroundImage: null,
      rawFile: null,
      annotations: [],
      isSolving: false,
      naturalWidth: undefined,
      naturalHeight: undefined,
    }));
    this.solveStatus.set('');
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private openAccessKeyModal(showError: boolean): void {
    const reason: 'first_time' | 'missing' | 'expired' = showError ? 'missing' : 'first_time';
    this.analyticsService.trackAccessKeyModalOpened(reason);

    if (this.modalRef) {
      this.modalRef.setInput('showError', showError);
      this.modalRef.changeDetectorRef.detectChanges();
      return;
    }
    const ref = createComponent(AccessKeyModalComponent, {
      environmentInjector: this.envInjector,
    });
    ref.setInput('showError', showError);
    ref.instance.submitted.subscribe((key: string) => {
      this.destroyModal();
      this.triggerPlateSolve(key);
    });
    ref.instance.cancelled.subscribe(() => {
      this.destroyModal();
    });
    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(ref.location.nativeElement);
    ref.changeDetectorRef.detectChanges();
    this.modalRef = ref;
  }

  private destroyModal(): void {
    if (this.modalRef) {
      this.appRef.detachView(this.modalRef.hostView);
      this.modalRef.destroy();
      this.modalRef = null;
    }
  }
}
