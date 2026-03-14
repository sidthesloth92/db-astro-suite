import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SliderComponent } from '@db-astro-suite/ui';
import { GlobalAnnotationSettings } from '../../models/annotation-settings.models';
import { CardDataService } from '../../services/card-data.service';

@Component({
  selector: 'dba-ag-annotation-settings',
  standalone: true,
  imports: [CommonModule, SliderComponent],
  templateUrl: './annotation-settings.html',
  styles: [
    `
      :host {
        display: block;
      }
      .settings-grid {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
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
        gap: 0.5rem;
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
      .future-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        opacity: 0.35;
        cursor: not-allowed;
      }
      .future-badge {
        font-size: 0.55rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--neon-pink);
        border: 1px solid currentColor;
        border-radius: 3px;
        padding: 1px 4px;
      }
      .settings-group-label {
        font-family: var(--db-form-font-mono, monospace);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #00f3ff;
        opacity: 0.9;
        font-weight: 700;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationSettingsComponent {
  private dataService = inject(CardDataService);

  settings = computed(() => this.dataService.stellarMapData().globalAnnotationSettings);

  update(patch: Partial<GlobalAnnotationSettings>) {
    this.dataService.updateGlobalAnnotationSettings(patch);
  }

  onThicknessChange(value: number) {
    this.update({ thickness: value });
  }

  onFontSizeChange(value: number) {
    this.update({ fontSize: value });
  }
}
