import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, ViewChild } from '@angular/core';
import { ConstellationLoaderComponent } from '@db-astro-suite/ui';
import { ImageAnnotation } from '../../models/annotation.models';
import { CardDataService } from '../../services/card-data.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';
import { AnnotationControlsComponent } from '../card-form/annotation-controls';

@Component({
  selector: 'dba-ag-stellar-map-preview',
  standalone: true,
  imports: [
    CommonModule,
    BaseCardPreviewComponent,
    AnnotationControlsComponent,
    ConstellationLoaderComponent,
  ],
  templateUrl: './stellar-map-preview.html',
  styles: [
    `
      .annotations-layer {
        position: absolute;
        inset: 0;
        z-index: 10;
        /* pointer-events auto so markers are clickable; background click deselects */
        pointer-events: auto;
      }
      .annotation-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        border-style: solid;
        border-radius: 50%;
        transition: all 0.25s ease;
        cursor: pointer;
        pointer-events: auto;
      }
      .annotation-marker.selected {
        outline: 2px solid rgba(255, 255, 255, 0.9);
        outline-offset: 3px;
        filter: brightness(1.4) drop-shadow(0 0 6px white);
      }
      .annotation-label {
        position: absolute;
        top: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.6);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
        white-space: nowrap;
        text-align: center;
        text-transform: uppercase;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 1);
        cursor: pointer;
      }
      .annotation-label.label-top {
        top: auto;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
      }
      .annotation-label.label-right {
        top: 50%;
        left: calc(100% + 6px);
        transform: translateY(-50%);
      }
      .annotation-label.label-left {
        top: 50%;
        left: auto;
        right: calc(100% + 6px);
        transform: translateY(-50%);
      }
      .solve-loader-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(4px);
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #00f3ff;
        overflow: hidden;
        clip-path: inset(0);
      }
      .solve-loader-canvas {
        position: relative;
        width: 180px;
        height: 180px;
        margin-bottom: 2rem;
        overflow: hidden;
        pointer-events: none;
      }
      .solve-loader-text {
        position: relative;
        z-index: 1;
        max-width: 14rem;
        text-align: center;
        font-family: var(--db-form-font-mono, monospace);
        font-weight: bold;
        font-size: 0.78rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 0.6;
        }
        50% {
          opacity: 1;
        }
      }
      .upload-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      }
      .upload-card-inner {
        position: relative;
        width: 100%;
        max-width: 340px;
        aspect-ratio: 1;
        padding: 2rem;
        background: rgba(10, 15, 25, 0.2);
        border: 2px dashed rgba(255, 45, 149, 0.2);
        border-radius: var(--db-radius-lg);
        overflow: hidden;
        isolation: isolate;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(4px);
      }
      .upload-card-loader {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        overflow: hidden;
        pointer-events: none;
      }
      .upload-card-loader::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(8, 12, 22, 0.45) 0%,
          rgba(8, 12, 22, 0.1) 40%,
          rgba(8, 12, 22, 0.4) 100%
        );
      }
      .upload-card-content {
        position: relative;
        z-index: 1;
        display: flex;
        height: 100%;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
      }
      .upload-card-inner:hover {
        border-color: var(--neon-pink);
        background: rgba(255, 45, 149, 0.08);
        box-shadow: 0 0 40px rgba(255, 45, 149, 0.15);
        transform: translateY(-2px);
      }
      .upload-icon {
        width: 48px;
        height: 48px;
        color: var(--neon-pink);
        filter: drop-shadow(0 0 8px rgba(255, 45, 149, 0.4));
      }
      .upload-title {
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: white;
      }
      .upload-subtitle {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--neon-pink);
        opacity: 0.7;
      }
      .upload-help-text {
        color: var(--neon-pink);
        font-size: 0.8rem;
        margin-top: 0.75rem;
        max-width: 220px;
        text-align: center;
        font-weight: 600;
        letter-spacing: 0.05em;
        opacity: 0.8;
      }
      .clear-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 45, 149, 0.08);
        border: 1px solid rgba(255, 45, 149, 0.4);
        color: var(--neon-pink);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .clear-btn:hover {
        background: rgba(255, 45, 149, 0.2);
        border-color: var(--neon-pink);
        box-shadow: 0 0 15px rgba(255, 45, 149, 0.4);
        color: white;
        transform: scale(1.1);
      }
      .add-annotation-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(0, 243, 255, 0.08);
        border: 1px solid rgba(0, 243, 255, 0.4);
        color: #00f3ff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .add-annotation-btn:hover {
        background: rgba(0, 243, 255, 0.2);
        border-color: #00f3ff;
        box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
        color: white;
        transform: scale(1.1);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StellarMapPreviewComponent {
  dataService = inject(CardDataService);
  mapData = this.dataService.stellarMapData;
  selectedAnnotationId = this.dataService.selectedAnnotationId;

  @ViewChild('controls') controlsComponent!: AnnotationControlsComponent;

  clearAll() {
    if (this.controlsComponent) {
      this.controlsComponent.resetMap();
    }
  }

  /**
   * Click handler shared by every annotation marker AND the layer background.
   *
   * Uses document.elementsFromPoint() to collect ALL stacked elements at the
   * click coordinate — including those hidden behind the topmost marker div.
   * Each annotation-marker candidate is ring-hit-tested: we only consider a
   * hit if the click lands within HIT_TOLERANCE px of the circle's border.
   * This lets the user click the ring of a small circle even when it is
   * fully inside the interior of a larger circle.
   */
  onAnnotationClick(event: MouseEvent) {
    event.stopPropagation();
    const HIT_TOLERANCE = 10; // px on either side of the border

    const allElements = document.elementsFromPoint(event.clientX, event.clientY);
    for (const el of allElements) {
      if (!(el instanceof HTMLElement)) continue;
      if (!el.classList.contains('annotation-marker')) continue;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((event.clientX - cx) ** 2 + (event.clientY - cy) ** 2);
      const radius = rect.width / 2;

      if (Math.abs(dist - radius) <= HIT_TOLERANCE) {
        const id = el.dataset['annotationId'];
        if (id) {
          const current = this.dataService.selectedAnnotationId();
          this.dataService.selectAnnotation(current === id ? null : id);
          return;
        }
      }
    }

    // No ring was hit — treat as background click and deselect
    this.dataService.selectAnnotation(null);
  }

  deselectAll() {
    this.dataService.selectAnnotation(null);
  }

  addCenterAnnotation() {
    const d = this.mapData();
    // Default radius = 12.5% of the smaller image dimension (→ ~25% diameter).
    // Falls back to 80px if image dimensions aren't recorded yet.
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

  /** Direct select bypassing ring-hit-test — used when clicking a label. */
  directSelect(id: string, event: MouseEvent) {
    event.stopPropagation();
    const current = this.dataService.selectedAnnotationId();
    this.dataService.selectAnnotation(current === id ? null : id);
  }

  // ── Effective style helpers ──────────────────────────────────────
  // Called per annotation during render. Safe with OnPush because
  // they only run when the signal-driven change detection triggers.

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
    if (override !== undefined) return override;
    return this.mapData().globalAnnotationSettings.showMagnitude ?? false;
  }

  getLabelPosition(xPercent: number, yPercent: number): string {
    if (yPercent > 90) return 'label-top';
    if (xPercent < 10) return 'label-right';
    if (xPercent > 90) return 'label-left';
    return '';
  }

  // ── Type lookup sets (OpenNGC codes + SIMBAD OTYPEs, all uppercase) ────────
  private static readonly STAR_TYPES = new Set([
    // OpenNGC
    'STAR',
    '*',
    '**',
    '*ASS',
    // SIMBAD
    'V*',
    'CE*',
    'RR*',
    'LP*',
    'MI*',
    'SR*',
    'NO*',
    'SN*',
    'WR*',
    'C*',
    'BE*',
    'HB*',
    'WD*',
    'N*',
    'TT*',
    'AE*',
    'HS*',
    'S*',
    'SG*',
    'S*R',
    'S*B',
    'S*Y',
    'EM*',
    'OR*',
  ]);
  private static readonly GALAXY_TYPES = new Set([
    // OpenNGC
    'G',
    'GPAIR',
    'GTRPL',
    'GGROUP',
    // SIMBAD
    'GX',
    'GIP',
    'GIG',
    'GIC',
    'BCLG',
    'SY*',
    'SY1',
    'SY2',
    'AGN',
    'LINER',
    'EMG',
  ]);
  private static readonly OPEN_CLUSTER_TYPES = new Set([
    // OpenNGC
    'OCL',
    'CL+N',
    // SIMBAD
    'OPC',
    'CL*',
    'AS*',
    'OAS',
  ]);
  private static readonly GLOB_CLUSTER_TYPES = new Set([
    // OpenNGC
    'GCL',
    // SIMBAD
    'GLC',
  ]);
  private static readonly NEBULA_TYPES = new Set([
    // OpenNGC
    'HII',
    'EMN',
    'NEB',
    'RFN',
    'DARKNEB',
    'SNR',
    'NOVA',
    // SIMBAD
    'RNE',
    'MOC',
    'DNE',
    'SNR',
    'EMO',
    'BUB',
    'HH',
  ]);
  private static readonly GALAXY_CLUSTER_TYPES = new Set([
    // OpenNGC / local ACO
    'GCLUS',
    // SIMBAD
    'CLG',
  ]);
  private static readonly QUASAR_TYPES = new Set(['QSO', 'BLA']);

  visibleAnnotations = computed(() => {
    const f = this.mapData().filters;
    const T = StellarMapPreviewComponent;

    return this.mapData().annotations.filter((ann) => {
      // User-placed custom annotations are always visible
      if (ann.source === 'custom') return ann.visible;

      const type = (ann.type ?? '').toUpperCase();
      const catalog = (ann.catalog ?? '').toUpperCase();
      const name = (ann.name ?? '').toUpperCase();
      const label = (ann.label ?? '').toUpperCase();
      const mag = ann.magnitude ?? Infinity;

      // ── Stars ────────────────────────────────────────────────────
      if (T.STAR_TYPES.has(type)) {
        const isHD = catalog === 'HD' || name.startsWith('HD ') || label.startsWith('HD ');
        const namedMatch =
          f.showNamedStars && !!ann.commonName && !isHD && mag <= f.maxStarMagnitude;
        const hdMatch = f.showHDStars && isHD && mag <= f.maxStarMagnitude;
        return namedMatch || hdMatch;
      }

      // ── DSOs: accumulate OR across all matching groups ───────────
      let show = false;

      // Catalog-level
      if (catalog === 'M' || type === 'M') show ||= f.showMessier;
      if (catalog === 'C' || type === 'C') show ||= f.showCaldwell;
      if (catalog === 'SH2') show ||= f.showSharpless;
      if (catalog === 'ACO') show ||= f.showAbellClusters;
      if (name.startsWith('NGC') || (catalog === 'NGC/IC' && name.startsWith('NGC')))
        show ||= f.showNGC;
      if (name.startsWith('IC') || (catalog === 'NGC/IC' && name.startsWith('IC')))
        show ||= f.showIC;
      // Also handle SIMBAD names like 'M 13', 'NGC 6205'
      if (!name.startsWith('NGC') && label.startsWith('NGC')) show ||= f.showNGC;
      if (!name.startsWith('IC') && label.startsWith('IC')) show ||= f.showIC;

      // Object-type checks
      if (T.GALAXY_TYPES.has(type)) show ||= f.showGalaxies;
      if (T.OPEN_CLUSTER_TYPES.has(type)) show ||= f.showOpenClusters;
      if (T.GLOB_CLUSTER_TYPES.has(type)) show ||= f.showGlobularClusters;
      if (type === 'PN') show ||= f.showPlanetaryNebulae;
      if (T.NEBULA_TYPES.has(type)) show ||= f.showNebulae;
      if (T.GALAXY_CLUSTER_TYPES.has(type)) show ||= f.showAbellClusters;
      if (T.QUASAR_TYPES.has(type)) show ||= f.showQuasars;

      // ── Final fallback: unknown / Dup / Other / NonEx types ──────
      // Use catalog or name prefix so nothing silently disappears
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
        // SIMBAD objects with unrecognised types: show under NGC/IC if local, show under Named Stars fallback otherwise
        else if (ann.source === 'simbad') show = f.showNGC;
      }

      return show;
    });
  });

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
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
  }
}
