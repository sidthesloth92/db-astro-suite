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
        border: 1px solid #00f3ff;
        border-radius: 50%;
        transition: all 0.3s ease;
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

  visibleAnnotations = computed(() => {
    const filters = this.mapData().filters;
    const items = this.mapData().annotations.filter((ann) => {
      const type = ann.type?.toUpperCase() || '';
      const lbl = (ann.label || '').toUpperCase();

      // Show Messier objects: Either explicit type 'M' or starts with M + digit
      if (type === 'M' || (lbl.startsWith('M') && /\d/.test(lbl))) {
        return filters.showMessier;
      }

      // Show NGC/IC: Explicit morphological types, generic catalogs, or explicit naming structure
      const isDSO = ['NGC', 'IC', 'NGC/IC', 'NEB', 'G', 'PN', 'OCL'].includes(type);
      const hasDsoName =
        lbl.startsWith('NGC') ||
        lbl.startsWith('IC') ||
        (ann.name &&
          (ann.name.toUpperCase().startsWith('NGC') || ann.name.toUpperCase().startsWith('IC')));

      if (isDSO || hasDsoName) {
        return filters.showNgc;
      }

      // Show Everything else if Stars/Named is checked (includes SIMBAD deep hits)
      return filters.showNamedStars;
    });

    console.log(
      `Visible Annotations: ${items.length} (Filters: M:${filters.showMessier}, NGC:${filters.showNgc}, Stars:${filters.showNamedStars})`,
    );
    return items;
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
