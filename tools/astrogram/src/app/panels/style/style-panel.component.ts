import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ColorSwatchInputComponent,
  IconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  imageIcon,
  paletteIcon,
} from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel for card format, accent colours, opacity, and the
 * background image. Format choice is delegated to
 * `CardDataService.setPreviewSize()` so this surface stays in sync with
 * the preview-context-bar's size dropdown.
 */
@Component({
  selector: 'dba-ag-style-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    ColorSwatchInputComponent,
    MicroSliderComponent,
    IconComponent,
  ],
  templateUrl: './style-panel.component.html',
  styleUrls: ['./style-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StylePanelComponent {
  private readonly dataService = inject(CardDataService);

  /** Current card document. */
  readonly cardData = this.dataService.cardData;

  /** Glyphs rendered next to each section title. */
  protected readonly paletteIcon = paletteIcon;
  protected readonly imageIcon = imageIcon;

  /** Current card opacity expressed in 0–100 for the slider readout. */
  readonly opacityPercent = computed(() => Math.round(this.cardData().cardOpacity * 100));

  /** Patches the accent colour and its parsed RGB tuple. */
  setAccentColor(hex: string): void {
    const rgb = this.hexToRgbString(hex);
    this.dataService.updateData({ accentColor: hex, accentColorRgb: rgb });
  }

  /** Patches the secondary accent colour (drives the cyan OIII ring / pills). */
  setSecondaryColor(hex: string): void {
    this.dataService.updateData({ secondaryAccentColor: hex });
  }

  /** Patches the card opacity (slider emits 0–100). */
  setOpacityPercent(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    this.dataService.updateData({ cardOpacity: clamped / 100 });
  }

  /** Handles a new background-image upload, encoding it as a data URL. */
  onImageUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        this.dataService.updateData({ backgroundImage: result });
      }
    };
    reader.readAsDataURL(file);
  }

  /** Removes the current background image. */
  removeBackground(): void {
    this.dataService.updateData({ backgroundImage: null });
  }

  private hexToRgbString(hex: string): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
}
