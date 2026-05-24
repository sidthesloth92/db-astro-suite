import { DecimalPipe, NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  PillBadgeComponent,
  plusIcon,
  trashIcon,
} from '@db-astro-suite/ui';
import { findHitAnnotationId } from '../../utils/annotation-hit-test.util';
import { ImageAnnotation } from '../../models/annotation.models';
import { StellarUploadPanelComponent } from '../../panels/stellar-upload/stellar-upload-panel.component';
import { CardDataService } from '../../services/card-data.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';

/**
 * Stellar-map preview surface. Wraps `BaseCardPreviewComponent` and
 * owns the canvas-level interactions (drag, hit-test, annotation
 * rendering). Upload / Solve flow is delegated to
 * `StellarUploadPanelComponent`, projected as an overlay when no image
 * is loaded. Adds a floating top toolbar (Add / Select / object count
 * pill) on top of the preview when an image is present.
 */
@Component({
  selector: 'dba-ag-stellar-map-preview',
  standalone: true,
  imports: [
    NgClass,
    NgStyle,
    DecimalPipe,
    BaseCardPreviewComponent,
    StellarUploadPanelComponent,
    IconButtonComponent,
    IconComponent,
    PillBadgeComponent,
  ],
  templateUrl: './stellar-map-preview.html',
  styleUrls: ['./stellar-map-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StellarMapPreviewComponent {
  private readonly dataService = inject(CardDataService);
  readonly mapData = this.dataService.stellarMapData;
  readonly selectedAnnotationId = this.dataService.selectedAnnotationId;

  /** Plus glyph used on the Add annotation FAB. */
  protected readonly plusIcon = plusIcon;
  /** Trash glyph used on the in-toolbar delete-selected button. */
  protected readonly trashIcon = trashIcon;

  /** The currently-selected annotation, or `null` when nothing is selected. */
  readonly selectedAnnotation = computed<ImageAnnotation | null>(() => {
    const id = this.selectedAnnotationId();
    if (!id) return null;
    return this.mapData().annotations.find((ann) => ann.id === id) ?? null;
  });

  /** Removes the currently-selected annotation, if any. */
  deleteSelectedAnnotation(): void {
    const id = this.selectedAnnotationId();
    if (!id) return;
    this.dataService.removeAnnotation(id);
  }

  private readonly _dragId = signal<string | null>(null);
  private readonly _dragStartMouse = signal<{ x: number; y: number } | null>(null);
  /** True while an annotation drag is in progress. */
  readonly isDragging = computed(() => this._dragId() !== null);

  private readonly base = viewChild.required<BaseCardPreviewComponent>('base');
  private readonly uploadPanel = viewChild.required<StellarUploadPanelComponent>('upload');
  private readonly annotationsLayerRef = viewChild.required<ElementRef>('annotationsLayer');

  /** Triggers the underlying export pipeline. */
  exportCard(): void {
    this.base().exportCard();
  }

  /** Number of currently-visible annotations (drives the toolbar pill). */
  readonly visibleCount = computed(() => this.visibleAnnotations().length);

  /** Resets the map document via the upload panel (single source of truth). */
  clearAll(): void {
    this.uploadPanel().resetMap();
  }

  /** Click handler shared by annotation markers and the layer background. */
  onAnnotationClick(event: MouseEvent): void {
    event.stopPropagation();
    const hitId = findHitAnnotationId(event, 10);
    if (hitId) {
      const current = this.dataService.selectedAnnotationId();
      this.dataService.selectAnnotation(current === hitId ? null : hitId);
      return;
    }
    this.dataService.selectAnnotation(null);
  }

  /** Deselect everything. */
  deselectAll(): void {
    this.dataService.selectAnnotation(null);
  }

  /** Records drag-start state on mousedown. */
  onMarkerMousedown(ann: ImageAnnotation, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._dragId.set(ann.id);
    this._dragStartMouse.set({ x: event.clientX, y: event.clientY });
  }

  /** Repositions the active annotation while dragging. */
  onLayerMousemove(event: MouseEvent): void {
    const dragId = this._dragId();
    if (!dragId) {
      return;
    }
    const rect = this.annotationsLayerRef().nativeElement.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    this.dataService.updateAnnotationPosition(dragId, xPercent, yPercent);
  }

  /** Ends a drag and resolves selection. */
  onLayerMouseup(event: MouseEvent): void {
    const dragId = this._dragId();
    if (dragId) {
      const startMouse = this._dragStartMouse();
      if (startMouse) {
        const dx = event.clientX - startMouse.x;
        const dy = event.clientY - startMouse.y;
        if (Math.sqrt(dx * dx + dy * dy) < 3) {
          const current = this.dataService.selectedAnnotationId();
          this.dataService.selectAnnotation(current === dragId ? null : dragId);
        } else {
          this.dataService.selectAnnotation(dragId);
        }
      }
      this._dragId.set(null);
      this._dragStartMouse.set(null);
    } else {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.('.annotation-marker')) {
        this.dataService.selectAnnotation(null);
      }
    }
  }

  /** Cancels a drag when the pointer leaves the layer (never deselects). */
  onLayerMouseleave(): void {
    this._dragId.set(null);
    this._dragStartMouse.set(null);
  }

  /** Adds a new custom annotation at the centre of the canvas. */
  addCenterAnnotation(): void {
    const d = this.mapData();
    const radiusDb =
      d.naturalWidth && d.naturalHeight
        ? Math.round(Math.min(d.naturalWidth, d.naturalHeight) * 0.125)
        : 80;
    const ann: ImageAnnotation = {
      id: 'custom-' + Date.now(),
      xPercent: 50,
      yPercent: 50,
      radiusDb,
      label: 'Custom',
      visible: true,
      source: 'custom',
    };
    this.dataService.addAnnotation(ann);
  }

  /** Direct selection bypassing the ring hit-test (used by label clicks). */
  directSelect(id: string, event: MouseEvent): void {
    event.stopPropagation();
    const current = this.dataService.selectedAnnotationId();
    this.dataService.selectAnnotation(current === id ? null : id);
  }

  // TODO(stellar-annotation-color-mix): the `66` / `4d` alpha-hex suffixes
  // below assume the bound colour is a 6-character hex string. The cleaner
  // approach is `color-mix(in srgb, <color> 40%, transparent)`, but that
  // requires the colour to come in as a CSS token rather than a hex
  // literal — pre-existing pattern carried into this PR untouched.
  markerStyle(ann: ImageAnnotation): Record<string, string> {
    const g = this.mapData().globalAnnotationSettings;
    const s = ann.style ?? {};
    const color = s.color ?? g.color;
    const thickness = s.thickness ?? g.thickness;
    const opacity = s.opacity ?? g.circleOpacity;
    const radius = (s.radiusOverride ?? ann.radiusDb) * 2;
    return {
      width: radius + 'px',
      height: radius + 'px',
      'border-width': thickness + 'px',
      'border-color': color,
      'box-shadow': `0 0 ${thickness * 4}px ${color}66`,
      opacity: String(opacity),
    };
  }

  labelStyle(ann: ImageAnnotation): Record<string, string> {
    const g = this.mapData().globalAnnotationSettings;
    const s = ann.style ?? {};
    const color = s.labelColor ?? g.labelColor;
    const opacity = s.labelOpacity ?? g.labelOpacity;
    return {
      color,
      opacity: String(opacity),
      'font-size': (s.fontSize ?? g.fontSize) + 'rem',
      'font-family': g.fontFamily,
      border: `1px solid ${color}4d`,
    };
  }

  effectiveLabel(ann: ImageAnnotation): string {
    return ann.style?.customLabel || ann.label;
  }

  effectiveShowLabel(ann: ImageAnnotation): boolean {
    return ann.style?.showLabel ?? true;
  }

  effectiveShowMagnitude(ann: ImageAnnotation): boolean {
    const override = ann.style?.showMagnitude;
    if (override !== undefined) {
      return override;
    }
    return this.mapData().globalAnnotationSettings.showMagnitude ?? false;
  }

  getLabelPosition(xPercent: number, yPercent: number): string {
    if (yPercent > 90) {
      return 'label-top';
    }
    if (xPercent < 10) {
      return 'label-right';
    }
    if (xPercent > 90) {
      return 'label-left';
    }
    return '';
  }

  // ── Type lookup sets (OpenNGC codes + SIMBAD OTYPEs, all uppercase) ────────
  private static readonly STAR_TYPES = new Set([
    'STAR', '*', '**', '*ASS',
    'V*', 'CE*', 'RR*', 'LP*', 'MI*', 'SR*', 'NO*', 'SN*', 'WR*', 'C*',
    'BE*', 'HB*', 'WD*', 'N*', 'TT*', 'AE*', 'HS*', 'S*', 'SG*', 'S*R',
    'S*B', 'S*Y', 'EM*', 'OR*',
  ]);
  private static readonly GALAXY_TYPES = new Set([
    'G', 'GPAIR', 'GTRPL', 'GGROUP',
    'GX', 'GIP', 'GIG', 'GIC', 'BCLG', 'SY*', 'SY1', 'SY2', 'AGN', 'LINER', 'EMG',
  ]);
  private static readonly OPEN_CLUSTER_TYPES = new Set([
    'OCL', 'CL+N', 'OPC', 'CL*', 'AS*', 'OAS',
  ]);
  private static readonly GLOB_CLUSTER_TYPES = new Set(['GCL', 'GLC']);
  private static readonly NEBULA_TYPES = new Set([
    'HII', 'EMN', 'NEB', 'RFN', 'DARKNEB', 'SNR', 'NOVA',
    'RNE', 'MOC', 'DNE', 'EMO', 'BUB', 'HH',
  ]);
  private static readonly GALAXY_CLUSTER_TYPES = new Set(['GCLUS', 'CLG']);
  private static readonly QUASAR_TYPES = new Set(['QSO', 'BLA']);

  readonly visibleAnnotations = computed(() => {
    const f = this.mapData().filters;
    const T = StellarMapPreviewComponent;

    return this.mapData().annotations.filter((ann) => {
      if (ann.source === 'custom') {
        return ann.visible;
      }

      const type = (ann.type ?? '').toUpperCase();
      const catalog = (ann.catalog ?? '').toUpperCase();
      const name = (ann.name ?? '').toUpperCase();
      const label = (ann.label ?? '').toUpperCase();
      const mag = ann.magnitude ?? Infinity;

      if (T.STAR_TYPES.has(type)) {
        const isHD = catalog === 'HD' || name.startsWith('HD ') || label.startsWith('HD ');
        const namedMatch =
          f.showNamedStars && !!ann.commonName && !isHD && mag <= f.maxStarMagnitude;
        const hdMatch = f.showHDStars && isHD && mag <= f.maxStarMagnitude;
        return namedMatch || hdMatch;
      }

      let show = false;

      if (catalog === 'M' || type === 'M') show ||= f.showMessier;
      if (catalog === 'C' || type === 'C') show ||= f.showCaldwell;
      if (catalog === 'SH2') show ||= f.showSharpless;
      if (catalog === 'ACO') show ||= f.showAbellClusters;
      if (name.startsWith('NGC') || (catalog === 'NGC/IC' && name.startsWith('NGC')))
        show ||= f.showNGC;
      if (name.startsWith('IC') || (catalog === 'NGC/IC' && name.startsWith('IC')))
        show ||= f.showIC;
      if (!name.startsWith('NGC') && label.startsWith('NGC')) show ||= f.showNGC;
      if (!name.startsWith('IC') && label.startsWith('IC')) show ||= f.showIC;

      if (T.GALAXY_TYPES.has(type)) show ||= f.showGalaxies;
      if (T.OPEN_CLUSTER_TYPES.has(type)) show ||= f.showOpenClusters;
      if (T.GLOB_CLUSTER_TYPES.has(type)) show ||= f.showGlobularClusters;
      if (type === 'PN') show ||= f.showPlanetaryNebulae;
      if (T.NEBULA_TYPES.has(type)) show ||= f.showNebulae;
      if (T.GALAXY_CLUSTER_TYPES.has(type)) show ||= f.showAbellClusters;
      if (T.QUASAR_TYPES.has(type)) show ||= f.showQuasars;

      if (!show) {
        if (catalog === 'NGC/IC' || name.startsWith('NGC') || label.startsWith('NGC'))
          show = f.showNGC;
        else if (name.startsWith('IC') || label.startsWith('IC')) show = f.showIC;
        else if (catalog === 'M' || name.startsWith('M ') || label.startsWith('M '))
          show = f.showMessier;
        else if (catalog === 'C' || name.startsWith('C ') || label.startsWith('C '))
          show = f.showCaldwell;
        else if (catalog === 'SH2') show = f.showSharpless;
        else if (catalog === 'ACO') show = f.showAbellClusters;
        else if (catalog === 'HD' || name.startsWith('HD '))
          show = f.showHDStars && mag <= f.maxStarMagnitude;
      }

      return show;
    });
  });
}
