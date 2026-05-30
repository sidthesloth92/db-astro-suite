import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ColorSwatchInputComponent,
  IconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  cropIcon,
  imageIcon,
  paletteIcon,
} from '@db-astro-suite/ui';
import {
  PREVIEW_SIZES,
  PREVIEW_SIZE_GROUPS,
  type PreviewSizeKey,
} from '../../constants/preview-sizes.constants';
import { CardDataService } from '../../services/card-data.service';
import type { FormatGroup, FormatOption } from './layout-panel.types';

/**
 * Inspector panel combining card format (aspect-ratio preset), accent
 * colours, opacity, and background image. Consolidates the former Format
 * section (previously in StylePanel) with colour and background controls.
 */
@Component({
  selector: 'dba-ag-layout-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    ColorSwatchInputComponent,
    MicroSliderComponent,
    IconComponent,
  ],
  templateUrl: './layout-panel.component.html',
  styleUrls: ['./layout-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPanelComponent {
  private readonly dataService = inject(CardDataService);

  /** Current card document. */
  readonly cardData = this.dataService.cardData;

  /** Currently selected preview-size key — drives the active-row highlight. */
  readonly selectedSizeKey = this.dataService.previewSizeKey;

  /** Glyphs rendered next to each section title. */
  protected readonly cropIcon = cropIcon;
  protected readonly paletteIcon = paletteIcon;
  protected readonly imageIcon = imageIcon;

  /** All format options grouped by social platform, shown in the scrollable picker. */
  readonly formatGroups: readonly FormatGroup[] = PREVIEW_SIZE_GROUPS.map((group) => ({
    label: group.label,
    options: group.keys.map<FormatOption>((key) => {
      const meta = PREVIEW_SIZES[key];
      const isAuto = meta.ratio === 'auto';
      return {
        key,
        label: meta.name,
        dims: isAuto ? 'matches source image' : `${meta.width} × ${meta.height}`,
        ratio: meta.ratio,
      };
    }),
  }));

  /** Current card opacity expressed in 0–100 for the slider readout. */
  readonly opacityPercent = computed(() => Math.round(this.cardData().cardOpacity * 100));

  /** Picks a new size preset; routes through the shared service to keep context in sync. */
  setFormat(key: PreviewSizeKey): void {
    this.dataService.setPreviewSize(key);
  }

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
