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

  onOpacityChange(value: number) {
    this.update({ opacity: value });
  }
}
