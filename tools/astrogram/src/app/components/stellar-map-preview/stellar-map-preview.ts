import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardDataService } from '../../services/card-data.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';

@Component({
  selector: 'dba-ag-stellar-map-preview',
  standalone: true,
  imports: [CommonModule, BaseCardPreviewComponent],
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
        border: 1px solid rgba(0, 243, 255, 0.8);
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
      }
      .annotation-label {
        position: absolute;
        top: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        color: #00f3ff;
        font-size: 0.6rem;
        font-family: var(--db-form-font-mono, monospace);
        white-space: nowrap;
        text-transform: uppercase;
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StellarMapPreviewComponent {
  dataService = inject(CardDataService);
  mapData = this.dataService.stellarMapData;

  visibleAnnotations = computed(() => {
    const filters = this.mapData().filters;
    return this.mapData().annotations.filter((ann) => {
      if (!ann.visible) return false;
      const lbl = ann.label.toUpperCase();
      if (lbl.startsWith('M') && /\d/.test(lbl)) return filters.showMessier;
      if (lbl.startsWith('NGC') || lbl.startsWith('IC')) return filters.showNgc;
      return filters.showNamedStars;
    });
  });
}
