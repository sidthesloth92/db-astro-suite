import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SliderComponent } from '@db-astro-suite/ui';
import { AnnotationStyle } from '../../models/annotation-settings.models';
import { ImageAnnotation } from '../../models/annotation.models';
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'dba-ag-annotation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, SliderComponent],
  templateUrl: './annotation-detail.html',
  styles: [
    `
      :host {
        display: block;
      }
      .detail-grid {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
      }
      .object-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .object-name {
        font-size: 1rem;
        font-weight: 800;
        color: white;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .object-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .object-badge {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(0, 243, 255, 0.7);
        border: 1px solid rgba(0, 243, 255, 0.3);
        border-radius: 3px;
        padding: 1px 5px;
      }
      .setting-row {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .setting-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(0, 243, 255, 0.5);
      }
      .color-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .color-swatch {
        width: 36px;
        height: 36px;
        border-radius: var(--db-radius-sm, 4px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        cursor: pointer;
        padding: 0;
        background: none;
        overflow: hidden;
        flex-shrink: 0;
      }
      .color-swatch input[type='color'] {
        width: 150%;
        height: 150%;
        border: none;
        cursor: pointer;
        margin: -25%;
        padding: 0;
        background: none;
      }
      .color-hex {
        font-size: 0.75rem;
        font-family: var(--db-form-font-mono, monospace);
        color: rgba(255, 255, 255, 0.75);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        flex: 1;
      }
      .reset-btn {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(0, 243, 255, 0.7);
        background: none;
        border: 1px solid rgba(0, 243, 255, 0.3);
        border-radius: 3px;
        padding: 2px 6px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .reset-btn:hover {
        color: #00f3ff;
        border-color: #00f3ff;
        background: rgba(0, 243, 255, 0.08);
      }
      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .toggle-label {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.85);
      }
      .toggle-switch {
        position: relative;
        width: 36px;
        height: 20px;
        flex-shrink: 0;
      }
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .toggle-track {
        position: absolute;
        inset: 0;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.15);
        transition: background 0.2s;
        cursor: pointer;
      }
      .toggle-track::after {
        content: '';
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        top: 3px;
        left: 3px;
        transition: transform 0.2s;
      }
      .toggle-switch input:checked + .toggle-track {
        background: var(--neon-pink);
      }
      .toggle-switch input:checked + .toggle-track::after {
        transform: translateX(16px);
      }
      .custom-label-input {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--db-radius-sm, 4px);
        color: white;
        font-size: 0.8rem;
        font-family: var(--db-form-font-mono, monospace);
        padding: 0.45rem 0.6rem;
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .custom-label-input:focus {
        outline: none;
        border-color: rgba(0, 243, 255, 0.5);
      }
      .custom-label-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
        font-style: italic;
      }
      .remove-btn {
        width: 100%;
        padding: 0.75rem;
        background: transparent;
        border: 1px solid rgba(255, 60, 60, 0.5);
        border-radius: var(--db-radius-md);
        color: rgba(255, 100, 100, 0.9);
        font-size: 0.75rem;
        font-weight: 800;
        font-family: var(--db-form-font-mono, monospace);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        margin-top: 0.5rem;
      }
      .remove-btn:hover {
        background: rgba(255, 60, 60, 0.12);
        border-color: rgba(255, 80, 80, 0.8);
        box-shadow: 0 0 12px rgba(255, 60, 60, 0.25);
      }
      .slider-with-reset {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .slider-reset-row {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationDetailComponent {
  private dataService = inject(CardDataService);

  annotation = computed<ImageAnnotation | null>(() => {
    const id = this.dataService.selectedAnnotationId();
    if (!id) return null;
    return this.dataService.stellarMapData().annotations.find((a) => a.id === id) ?? null;
  });

  globalSettings = computed(() => this.dataService.stellarMapData().globalAnnotationSettings);

  /** Effective colour: per-annotation override OR global default. */
  effectiveColor = computed(() => {
    const ann = this.annotation();
    return ann?.style?.color ?? this.globalSettings().color;
  });

  /** Effective radius for the slider (respects radiusOverride). */
  effectiveRadius = computed(() => {
    const ann = this.annotation();
    if (!ann) return 8;
    return ann.style?.radiusOverride ?? ann.radiusDb;
  });

  /** Effective label visibility. */
  effectiveShowLabel = computed(() => {
    const ann = this.annotation();
    if (!ann) return true;
    return ann.style?.showLabel ?? this.globalSettings().showLabels;
  });

  /** Effective opacity. */
  effectiveOpacity = computed(() => {
    const ann = this.annotation();
    if (!ann) return this.globalSettings().opacity;
    return ann.style?.opacity ?? this.globalSettings().opacity;
  });

  updateStyle(patch: Partial<AnnotationStyle>) {
    const id = this.dataService.selectedAnnotationId();
    if (id) this.dataService.updateAnnotationStyle(id, patch);
  }

  clearField(field: keyof AnnotationStyle) {
    const id = this.dataService.selectedAnnotationId();
    if (id) this.dataService.clearAnnotationStyleField(id, field);
  }

  remove() {
    const id = this.dataService.selectedAnnotationId();
    if (id) this.dataService.removeAnnotation(id);
  }

  hasColorOverride = computed(() => !!this.annotation()?.style?.color);
  hasOpacityOverride = computed(() => this.annotation()?.style?.opacity !== undefined);
  hasRadiusOverride = computed(() => this.annotation()?.style?.radiusOverride !== undefined);
  hasLabelOverride = computed(() => this.annotation()?.style?.showLabel !== undefined);
}
