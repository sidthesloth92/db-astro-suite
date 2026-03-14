import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
      .object-name-display {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
        height: var(--db-form-control-height);
      }
      .object-name-text {
        font-size: 0.75rem;
        font-weight: 800;
        color: white;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .edit-label-btn,
      .label-action-btn {
        display: none;
      }
      .object-name-edit {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
      }
      .object-name-input {
        width: 100%;
        height: var(--db-form-control-height);
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--db-glass-border);
        color: var(--db-color-text-primary);
        padding: 0 var(--db-form-input-padding, 0.5rem);
        font-size: 0.75rem;
        border-radius: var(--db-radius-sm);
        transition: all var(--db-transition-fast);
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
        flex: 1;
        min-width: 0;
      }
      .object-name-input:focus {
        border-color: var(--db-color-neon-pink);
        background: rgba(255, 45, 149, 0.05);
        box-shadow: 0 0 10px rgba(255, 45, 149, 0.2);
      }
      .object-name-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
        font-style: italic;
        font-weight: 400;
      }
      .object-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .action-icon-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.8);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        padding: 0;
      }
      .action-icon-btn.edit:hover {
        background: rgba(0, 243, 255, 0.15);
        border-color: rgba(0, 243, 255, 0.4);
        color: #00f3ff;
        box-shadow: 0 0 10px rgba(0, 243, 255, 0.3);
      }
      .action-icon-btn.save {
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.3);
      }
      .action-icon-btn.save:hover {
        background: rgba(74, 222, 128, 0.15);
        border-color: rgba(74, 222, 128, 0.5);
        box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
      }
      .action-icon-btn.cancel {
        color: rgba(255, 100, 100, 0.8);
        border-color: rgba(255, 100, 100, 0.3);
      }
      .action-icon-btn.cancel:hover {
        background: rgba(255, 68, 68, 0.15);
        border-color: rgba(255, 68, 68, 0.5);
        color: #ff4444;
        box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
      }
      .action-icon-btn.delete {
        color: rgba(255, 100, 100, 0.8);
        border-color: rgba(255, 100, 100, 0.3);
        margin-left: auto;
      }
      .action-icon-btn.delete:hover {
        background: rgba(255, 68, 68, 0.15);
        border-color: rgba(255, 68, 68, 0.5);
        color: #ff4444;
        box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
      }
      .remove-icon-btn:hover {
        background: rgba(255, 60, 60, 0.15);
        border-color: rgba(255, 80, 80, 0.8);
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
      .color-picker-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 45, 149, 0.2);
        padding: 0 8px;
        border-radius: 4px;
        height: var(--db-form-control-height);
      }
      .color-picker-wrapper input[type='color'] {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        flex-shrink: 0;
      }
      .color-val {
        font-size: 0.75rem;
        font-family: monospace;
        color: rgba(255, 255, 255, 0.85);
      }
      .color-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
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
        display: none;
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
      .detail-group-label {
        font-family: var(--db-form-font-mono, monospace);
        font-size: 0.625rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--db-color-neon-pink);
        opacity: 0.8;
        font-weight: 700;
        margin-top: 0.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationDetailComponent {
  private dataService = inject(CardDataService);

  isEditingLabel = signal(false);
  editLabelValue = signal('');

  startEditLabel() {
    const ann = this.annotation();
    this.editLabelValue.set(ann?.style?.customLabel ?? ann?.label ?? '');
    this.isEditingLabel.set(true);
  }

  saveLabel() {
    const val = this.editLabelValue().trim();
    const ann = this.annotation();
    this.updateStyle({ customLabel: val && val !== ann?.label ? val : undefined });
    this.isEditingLabel.set(false);
  }

  cancelLabel() {
    this.isEditingLabel.set(false);
  }

  annotation = computed<ImageAnnotation | null>(() => {
    const id = this.dataService.selectedAnnotationId();
    if (!id) return null;
    return this.dataService.stellarMapData().annotations.find((a) => a.id === id) ?? null;
  });

  globalSettings = computed(() => this.dataService.stellarMapData().globalAnnotationSettings);

  /** Effective circle colour: per-annotation override OR global. */
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

  /** Effective circle opacity. */
  effectiveOpacity = computed(() => {
    const ann = this.annotation();
    if (!ann) return this.globalSettings().circleOpacity;
    return ann.style?.opacity ?? this.globalSettings().circleOpacity;
  });

  /** Effective label colour: per-annotation override OR global. */
  effectiveLabelColor = computed(() => {
    const ann = this.annotation();
    return ann?.style?.labelColor ?? this.globalSettings().labelColor;
  });

  /** Effective label opacity. */
  effectiveLabelOpacity = computed(() => {
    const ann = this.annotation();
    if (!ann) return this.globalSettings().labelOpacity;
    return ann.style?.labelOpacity ?? this.globalSettings().labelOpacity;
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
  hasThicknessOverride = computed(() => this.annotation()?.style?.thickness !== undefined);
  hasLabelColorOverride = computed(() => !!this.annotation()?.style?.labelColor);
  hasLabelOpacityOverride = computed(() => this.annotation()?.style?.labelOpacity !== undefined);
  hasFontSizeOverride = computed(() => this.annotation()?.style?.fontSize !== undefined);
  hasRadiusOverride = computed(() => this.annotation()?.style?.radiusOverride !== undefined);

  effectiveThickness = computed(() => {
    const ann = this.annotation();
    return ann?.style?.thickness ?? this.globalSettings().thickness;
  });

  effectiveFontSize = computed(() => {
    const ann = this.annotation();
    return ann?.style?.fontSize ?? this.globalSettings().fontSize;
  });
}
