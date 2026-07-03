import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ColorSwatchInputComponent,
  IconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  SelectComponent,
  cropIcon,
  imageIcon,
  paletteIcon,
  sparklesIcon,
} from '@db-astro-suite/ui';
import {
  PREVIEW_SIZES,
  buildPreviewSizeSelectItems,
  type PreviewSizeKey,
} from '../../constants/preview-sizes.constants';
import {
  CARD_THEMES,
  buildCardThemeSelectItems,
  isCardThemeId,
} from '../../components/card-themes/card-themes.constants';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel combining card theme, format (aspect-ratio preset), accent
 * colours, opacity, and background image. Theme and size are both native
 * dropdowns; accent + background controls follow.
 */
@Component({
  selector: 'dba-ag-layout-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    ColorSwatchInputComponent,
    MicroSliderComponent,
    SelectComponent,
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

  /** Currently selected preview-size key — drives the size dropdown value. */
  readonly selectedSizeKey = this.dataService.previewSizeKey;

  /** Glyphs rendered next to each section title. */
  protected readonly sparklesIcon = sparklesIcon;
  protected readonly cropIcon = cropIcon;
  protected readonly paletteIcon = paletteIcon;
  protected readonly imageIcon = imageIcon;

  /** Theme dropdown options built from the registry. */
  readonly themeSelectItems = buildCardThemeSelectItems();

  /** Size dropdown options grouped by social platform. */
  readonly sizeSelectItems = buildPreviewSizeSelectItems();

  /** Active theme's helper subtitle shown under the theme picker. */
  readonly activeThemeSubtitle = computed(
    () => CARD_THEMES[this.cardData().cardTheme]?.subtitle ?? '',
  );

  /** Metadata for the selected size (drives the ratio proxy + px caption). */
  readonly selectedSizeMeta = computed(() => PREVIEW_SIZES[this.selectedSizeKey()]);

  /** Pixel-dimension caption for the selected size. */
  readonly sizeCaption = computed(() => {
    const meta = this.selectedSizeMeta();
    return meta.ratio === 'auto' ? 'Matches source image' : `${meta.width} × ${meta.height} px`;
  });

  /** Current card opacity expressed in 0–100 for the slider readout. */
  readonly opacityPercent = computed(() => Math.round(this.cardData().cardOpacity * 100));

  /** Applies a theme: sets the id and resets accents to the theme defaults. */
  setTheme(value: string | number | boolean): void {
    if (!isCardThemeId(value)) {
      return;
    }
    const accents = CARD_THEMES[value]?.accents;
    if (accents) {
      this.dataService.setCardTheme(value, accents);
    }
  }

  /** Picks a new size preset; routes through the shared service to keep context in sync. */
  onSizeChange(value: string | number | boolean): void {
    this.dataService.setPreviewSize(value as PreviewSizeKey);
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
