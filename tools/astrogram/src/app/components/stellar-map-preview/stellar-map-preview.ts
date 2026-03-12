import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, ViewChild } from '@angular/core';
import { CardDataService } from '../../services/card-data.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';
import { AnnotationControlsComponent } from '../card-form/annotation-controls';

@Component({
  selector: 'dba-ag-stellar-map-preview',
  standalone: true,
  imports: [CommonModule, BaseCardPreviewComponent, AnnotationControlsComponent],
  templateUrl: './stellar-map-preview.html',
  styles: [
    `
      .annotations-layer {
        position: absolute;
        inset: 0;
        z-index: 10;
        pointer-events: none;
      }
      .annotation-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        border: 2px solid rgba(0, 243, 255, 0.8);
        border-radius: 50%;
        transition: all 0.3s ease;
        box-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
      }
      .annotation-label {
        position: absolute;
        top: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        color: #00f3ff;
        background: rgba(0, 0, 0, 0.6);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.65rem;
        font-weight: bold;
        font-family: var(--db-form-font-mono, monospace);
        white-space: nowrap;
        text-transform: uppercase;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 1);
        border: 1px solid rgba(0, 243, 255, 0.3);
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
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #00f3ff;
      }
      .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(0, 243, 255, 0.2);
        border-top-color: #00f3ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .solve-loader-text {
        font-family: var(--db-form-font-mono, monospace);
        font-weight: bold;
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
        width: 100%;
        max-width: 340px;
        aspect-ratio: 1;
        padding: 2rem;
        background: rgba(10, 15, 25, 0.4);
        border: 2px dashed rgba(255, 45, 149, 0.2);
        border-radius: var(--db-radius-lg);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(8px);
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StellarMapPreviewComponent {
  dataService = inject(CardDataService);
  mapData = this.dataService.stellarMapData;

  @ViewChild('controls') controlsComponent!: AnnotationControlsComponent;

  clearAll() {
    if (this.controlsComponent) {
      this.controlsComponent.resetMap();
    }
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
        const hdMatch =
          f.showHDStars && isHD && mag <= f.maxStarMagnitude;
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
