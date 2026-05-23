import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ElementRef,
  EnvironmentInjector,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  computed,
  createComponent,
  inject,
  signal,
} from '@angular/core';
import { AccordionComponent, AccordionItemComponent, SliderComponent } from '@db-astro-suite/ui';
import { ImageAnnotation } from '../../models/annotation.models';
import { StellarMapData } from '../../models/card-data';
import { AstrosolveService } from '../../services/astrosolve.service';
import { CardDataService } from '../../services/card-data.service';
import { AccessKeyError } from '../../services/models/access-key.error';
import { WcsService } from '../../services/wcs.service';
import { AnalyticsService } from '@db-astro-suite/ui';
import { ASTROGRAM_USER_ID, PLATE_SOLVE_ERROR_ACCESS_KEY } from '../../constants/analytics.constants';
import { AccessKeyModalComponent } from './access-key-modal.component';
import { AnnotationDetailComponent } from './annotation-detail';
import { AnnotationSettingsComponent } from './annotation-settings';
@Component({
  selector: 'dba-ag-annotation-controls',
  standalone: true,
  imports: [
    CommonModule,
    SliderComponent,
    AccordionComponent,
    AccordionItemComponent,
    AnnotationSettingsComponent,
    AnnotationDetailComponent,
  ],
  templateUrl: './annotation-controls.html',
  exportAs: 'dbaAnnotationControls',
  styles: [
    `
      :host {
        display: block;
        padding: 1.5rem;
        font-family: var(--db-form-font-mono, monospace);
      }
      .controls-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .upload-card {
        border: 2px dashed rgba(255, 45, 149, 0.3);
        background: rgba(255, 45, 149, 0.05);
        border-radius: var(--db-radius-lg);
        padding: 2.5rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: center;
      }
      .upload-card:hover {
        border-color: var(--db-color-neon-pink);
        background: rgba(255, 45, 149, 0.1);
        box-shadow: 0 0 20px rgba(255, 45, 149, 0.15);
        transform: translateY(-2px);
      }
      .upload-card.has-image {
        border-style: solid;
        border-color: rgba(0, 243, 255, 0.3);
        background: rgba(0, 243, 255, 0.05);
      }
      .upload-card.has-image:hover {
        border-color: #00f3ff;
      }
      .upload-icon {
        width: 48px;
        height: 48px;
        color: var(--db-color-neon-pink);
        margin-bottom: 0.5rem;
      }
      .upload-card.has-image .upload-icon {
        color: #00f3ff;
      }
      .upload-title {
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: white;
      }
      .upload-subtitle {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--db-color-neon-pink);
        opacity: 0.8;
      }
      .upload-card.has-image .upload-subtitle {
        color: #00f3ff;
      }
      .action-btns {
        display: block;
      }
      .solve-btn {
        background: transparent;
        color: var(--db-color-neon-pink);
        border: 1px solid var(--db-color-neon-pink);
        width: 100%;
        padding: 1rem;
        border-radius: var(--db-radius-md);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .solve-btn:hover:not(:disabled) {
        background: rgba(255, 45, 149, 0.1);
        box-shadow: 0 0 20px rgba(255, 45, 149, 0.3);
        transform: translateY(-2px);
      }
      .solve-btn:active:not(:disabled) {
        background: var(--db-color-neon-pink);
        color: white;
      }
      .solve-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        border-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.3);
      }
      .status-text {
        font-size: 0.8rem;
        font-weight: bold;
        color: var(--db-color-neon-pink);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-align: center;
        margin-top: 0.5rem;
      }
      .filter-section-title {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--db-color-neon-pink);
        opacity: 0.6;
        margin: 0 0 1rem 0;
      }
      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .filter-group:last-child {
        border-bottom: none;
      }
      .filter-group-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(0, 243, 255, 0.5);
        margin-bottom: 0.25rem;
      }
      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1.2rem;
      }
      .filter-check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.85);
        user-select: none;
      }
      .filter-check input[type='checkbox'] {
        accent-color: var(--db-color-neon-pink);
        width: 14px;
        height: 14px;
        cursor: pointer;
      }
      .mag-slider-row {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        margin-top: 1rem;
      }
      .mag-tick-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.6rem;
        color: rgba(255, 255, 255, 0.35);
        padding: 0 2px;
        margin-top: -0.25rem;
      }
      .detail-panel {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .back-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: 1px solid rgba(0, 243, 255, 0.25);
        border-radius: var(--db-radius-md);
        color: rgba(0, 243, 255, 0.7);
        font-family: var(--db-form-font-mono, monospace);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
        align-self: flex-start;
      }
      .back-btn:hover {
        color: #00f3ff;
        border-color: rgba(0, 243, 255, 0.6);
        background: rgba(0, 243, 255, 0.06);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AnnotationControlsComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  dataService = inject(CardDataService);
  private readonly analyticsService = inject(AnalyticsService);

  mapData = this.dataService.stellarMapData;
  isSolving = signal(false);
  solveStatus = signal('');
  /** Tracks accordion open state for Annotation Filters; defaults open. */
  readonly filtersExpanded = signal(true);
  /** Tracks accordion open state for Annotation Settings; defaults open. */
  readonly settingsExpanded = signal(true);
  /** Human-readable summary of upload limits (e.g. "JPG/PNG · max 10 MB · 1000×1000 to 8000×8000"). Populated on init from the server's /api/v1/limits endpoint. */
  readonly uploadLimitsHint = signal('');
  /** Pre-upload validation error message — surfaced beneath the upload card when the picked file is rejected. Cleared on next valid pick. */
  readonly uploadError = signal('');

  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private modalRef: ComponentRef<AccessKeyModalComponent> | null = null;
  astrosolveService = inject(AstrosolveService);
  wcsService = inject(WcsService);

  constructor() {
    // Fire-and-forget: populate the upload-limits hint as soon as the
    // panel mounts. If the network call fails, the service falls back to
    // baked-in defaults so the hint never stays empty.
    this.astrosolveService
      .loadLimits()
      .then((limits) => {
        this.uploadLimitsHint.set(
          this.astrosolveService.formatLimitsHint(limits),
        );
      })
      .catch(() => {
        // Already handled inside the service — nothing to do here.
      });
  }

  private openAccessKeyModal(showError: boolean): void {
    // Track access key modal opening
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
      this.onAccessKeySubmit(key);
    });
    ref.instance.cancelled.subscribe(() => {
      this.destroyModal();
      this.onAccessKeyCancel();
    });
    this.appRef.attachView(ref.hostView);
    this.document.body.appendChild(ref.location.nativeElement);
    ref.changeDetectorRef.detectChanges();
    this.modalRef = ref;
  }

  ngOnDestroy(): void {
    this.destroyModal();
  }

  private destroyModal(): void {
    if (this.modalRef) {
      this.appRef.detachView(this.modalRef.hostView);
      this.modalRef.destroy();
      this.modalRef = null;
    }
  }

  /** True when an annotation is selected — drives the full-panel detail view. */
  hasSelection = computed(() => this.dataService.selectedAnnotationId() !== null);

  deselect() {
    this.dataService.selectAnnotation(null);
  }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  resetMap() {
    this.mapData.update((d) => ({
      ...d,
      backgroundImage: null,
      rawFile: null,
      annotations: [],
      isSolving: false,
      naturalWidth: undefined,
      naturalHeight: undefined,
    }));
    this.solveStatus.set('');
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  toggleFilter(
    key: keyof Omit<import('../../models/card-data').AnnotationFilters, 'maxStarMagnitude'>,
  ) {
    this.mapData.update((d) => ({
      ...d,
      filters: {
        ...d.filters,
        [key]: !d.filters[key as keyof typeof d.filters],
      },
    }));
  }

  setStarMagnitude(value: number) {
    this.mapData.update((d) => ({
      ...d,
      filters: { ...d.filters, maxStarMagnitude: value },
    }));
  }

  async onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Server-mirroring validation so the user finds out about a bad file
    // *before* the bytes travel. A soft warning still allows the upload
    // and is surfaced via solveStatus so it lives in the same channel as
    // other progress messages.
    const validation = await this.astrosolveService.validateForUpload(file);
    if (!validation.ok) {
      this.uploadError.set(validation.reason);
      // Clear the input so picking the same file again retriggers `change`.
      input.value = '';
      return;
    }
    this.uploadError.set('');
    if (validation.softWarning) {
      this.solveStatus.set(validation.softWarning);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Use a temporary image to detect natural dimensions for the WCS engine
      const img = new Image();
      img.onload = () => {
        this.mapData.update((d) => ({
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

  async triggerPlateSolve(pendingKey?: string) {
    const file = this.mapData().rawFile;
    if (!file) {
      this.solveStatus.set('Error: No image uploaded.');
      return;
    }

    if (!pendingKey && !this.astrosolveService.hasAccessKey()) {
      this.openAccessKeyModal(false);
      return;
    }

    // Track plate solve initiation
    this.analyticsService.trackPlateSolveInitiated(file.size, false);

    this.isSolving.set(true);
    this.mapData.update((d) => ({ ...d, isSolving: true }));
    this.solveStatus.set('Starting plate solve...');

    try {
      // Fetch everything — filtering is done client-side
      const hints = {};

      const result = await this.astrosolveService.solveImage(
        file,
        hints,
        (msg) => {
          this.solveStatus.set(msg);
        },
        pendingKey,
      );

      // Persist the newly-submitted key now that the API accepted it.
      if (pendingKey) {
        this.astrosolveService.saveAccessKey(pendingKey);
      }

      // Initialize the WCS projection engine with the actual input image dimensions
      const nW = this.mapData().naturalWidth || 1080;
      const nH = this.mapData().naturalHeight || 1080;
      this.wcsService.initialize(result.metadata.wcs, nW, nH);

      // Use WCS internal dimensions for coordinate math — these may differ from nW/nH
      // if the solver downsampled the image (--downsample 2 halves IMAGEW/IMAGEH in the header).
      // All pixel coordinates from skyToPix() are in this WCS pixel space.
      const wcsW = this.wcsService.getImageWidth() || nW;
      const wcsH = this.wcsService.getImageHeight() || nH;

      // Plate scale for sizing circles from angular diameters
      const scaleArcsecPerPx = this.wcsService.getArcsecPerPixel();

      // Map backend objects to ImageAnnotations using pixel coordinates
      const annotations: ImageAnnotation[] = result.objects
        .map((obj) => {
          // skyToPix now returns 0-based pixel coordinates in WCS pixel space
          const pix = this.wcsService.skyToPix(obj.ra, obj.dec);

          // Convert pixel coords to percentages for CSS positioning
          const xPercent = pix ? (pix.x / wcsW) * 100 : 0;
          const yPercent = pix ? (pix.y / wcsH) * 100 : 0;

          // Size the circle from the catalog angular diameter
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
            a.visible &&
            a.xPercent >= 0 &&
            a.xPercent <= 100 &&
            a.yPercent >= 0 &&
            a.yPercent <= 100,
        );

      this.mapData.update((d: StellarMapData) => ({
        ...d,
        annotations,
      }));

      this.solveStatus.set(`Success! Identified ${annotations.length} objects.`);

      // Track plate solve event
      const toolsUsed = `plate-solve,wcs-projection,${annotations.length}-objects`;
      this.analyticsService.trackImageGeneration(ASTROGRAM_USER_ID, toolsUsed);
    } catch (err: unknown) {
      if (err instanceof AccessKeyError) {
        // Key was rejected — discard it (whether it came from storage or from
        // the modal submission) so the user is prompted to enter a new one.
        this.astrosolveService.clearAccessKey();
        this.analyticsService.trackPlateSolveFailed(PLATE_SOLVE_ERROR_ACCESS_KEY);
        this.solveStatus.set('');
        this.openAccessKeyModal(true);
        return;
      }
      // Non-401 failure: the key wasn't rejected by the server, so persist it
      // for subsequent attempts.
      if (pendingKey) {
        this.astrosolveService.saveAccessKey(pendingKey);
      }
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      this.analyticsService.trackPlateSolveFailed(message);
      this.solveStatus.set(`Error: ${message}`);
    } finally {
      this.isSolving.set(false);
      this.mapData.update((d) => ({ ...d, isSolving: false }));
      // Clear status after a few seconds on success
      if (!this.solveStatus().startsWith('Error')) {
        setTimeout(() => this.solveStatus.set(''), 5000);
      }
    }
  }

  onAccessKeySubmit(key: string): void {
    // Don't persist yet — let triggerPlateSolve decide based on the API's response.
    this.triggerPlateSolve(key);
  }

  onAccessKeyCancel(): void {
    // modal already destroyed by destroyModal() before this is called
  }
}
