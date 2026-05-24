import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AnalyticsService,
  ColorSwatchInputComponent,
  IconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  SwitchComponent,
  rotateCcwIcon,
  tagIcon,
  targetIcon,
} from '@db-astro-suite/ui';
import type { AnnotationStyle } from '../../models/annotation-settings.models';
import type { ImageAnnotation } from '../../models/annotation.models';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel that exposes per-annotation overrides for the
 * currently-selected annotation. Mirrors the control surface of the
 * global Annotation Style panel (circle colour / thickness / opacity,
 * label colour / font size / opacity, show-magnitude) and layers in
 * the per-annotation extras: custom label, size override, delete.
 *
 * Each override falls back to the matching `GlobalAnnotationSettings`
 * value when undefined, so the displayed slider/swatch always reflects
 * the effective render value.
 */
@Component({
  selector: 'dba-ag-annotation-selected-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    MicroSliderComponent,
    ColorSwatchInputComponent,
    SwitchComponent,
    IconComponent,
  ],
  templateUrl: './annotation-selected-panel.component.html',
  styleUrls: ['./annotation-selected-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationSelectedPanelComponent {
  private readonly dataService = inject(CardDataService);
  private readonly analyticsService = inject(AnalyticsService);

  /** Target glyph rendered in the Identity + Circle section titles. */
  protected readonly targetIcon = targetIcon;
  /** Tag glyph rendered in the Label section title. */
  protected readonly tagIcon = tagIcon;
  /** Counter-clockwise rotate glyph rendered on the Revert button. */
  protected readonly rotateCcwIcon = rotateCcwIcon;

  /** Currently-selected annotation, or null when none is selected. */
  readonly annotation = computed<ImageAnnotation | null>(() => {
    const id = this.dataService.selectedAnnotationId();
    if (!id) {
      return null;
    }
    return this.dataService.stellarMapData().annotations.find((a) => a.id === id) ?? null;
  });

  /** Global settings used as fallbacks when an override isn't set. */
  readonly globalSettings = computed(
    () => this.dataService.stellarMapData().globalAnnotationSettings,
  );

  /** Effective label (override OR original). */
  readonly effectiveLabel = computed(() => {
    const a = this.annotation();
    if (!a) {
      return '';
    }
    return a.style?.customLabel ?? a.label ?? '';
  });

  /** Effective circle radius for the size slider. */
  readonly effectiveRadius = computed(() => {
    const a = this.annotation();
    if (!a) {
      return 0;
    }
    return a.style?.radiusOverride ?? a.radiusDb;
  });

  /** Effective thickness for the thickness slider. */
  readonly effectiveThickness = computed(() => {
    const a = this.annotation();
    if (!a) {
      return this.globalSettings().thickness;
    }
    return a.style?.thickness ?? this.globalSettings().thickness;
  });

  /** Max radius the slider allows — half the smaller image dimension. */
  readonly maxRadius = computed(() => {
    const d = this.dataService.stellarMapData();
    if (d.naturalWidth && d.naturalHeight) {
      return Math.floor(Math.min(d.naturalWidth, d.naturalHeight) / 2);
    }
    return 400;
  });

  /** Effective circle colour (override → global). */
  readonly effectiveColor = computed(
    () => this.annotation()?.style?.color ?? this.globalSettings().color,
  );

  /** Effective circle opacity 0–1 (override → global). */
  readonly effectiveCircleOpacity = computed(
    () => this.annotation()?.style?.opacity ?? this.globalSettings().circleOpacity,
  );

  /** Circle opacity expressed in 0–100 for the slider readout. */
  readonly circleOpacityPercent = computed(() =>
    Math.round(this.effectiveCircleOpacity() * 100),
  );

  /** Effective label colour (override → global). */
  readonly effectiveLabelColor = computed(
    () => this.annotation()?.style?.labelColor ?? this.globalSettings().labelColor,
  );

  /** Effective label font size (override → global). */
  readonly effectiveFontSize = computed(
    () => this.annotation()?.style?.fontSize ?? this.globalSettings().fontSize,
  );

  /** Effective label opacity 0–1 (override → global). */
  readonly effectiveLabelOpacity = computed(
    () => this.annotation()?.style?.labelOpacity ?? this.globalSettings().labelOpacity,
  );

  /** Label opacity expressed in 0–100 for the slider readout. */
  readonly labelOpacityPercent = computed(() =>
    Math.round(this.effectiveLabelOpacity() * 100),
  );

  /** Effective show-magnitude toggle (override → global). */
  readonly effectiveShowMagnitude = computed(
    () => this.annotation()?.style?.showMagnitude ?? this.globalSettings().showMagnitude,
  );

  /**
   * True when the selected annotation has any per-annotation overrides
   * set (label, size, colour, etc.). Drives the Revert button's enabled
   * state — there's nothing to revert when the annotation already
   * inherits everything from the global settings.
   */
  readonly hasOverrides = computed(() => {
    const style = this.annotation()?.style;
    return !!style && Object.keys(style).length > 0;
  });

  /**
   * Returns a computed that flips to `true` when the named per-annotation
   * style field is currently overridden. Used to drive the small "Use
   * global" chip rendered next to each control's label.
   */
  private isOverridden<K extends keyof AnnotationStyle>(field: K) {
    return computed(() => this.annotation()?.style?.[field] !== undefined);
  }

  readonly isLabelOverridden = this.isOverridden('customLabel');
  readonly isSizeOverridden = this.isOverridden('radiusOverride');
  readonly isColorOverridden = this.isOverridden('color');
  readonly isThicknessOverridden = this.isOverridden('thickness');
  readonly isCircleOpacityOverridden = this.isOverridden('opacity');
  readonly isLabelColorOverridden = this.isOverridden('labelColor');
  readonly isFontSizeOverridden = this.isOverridden('fontSize');
  readonly isLabelOpacityOverridden = this.isOverridden('labelOpacity');
  readonly isShowMagOverridden = this.isOverridden('showMagnitude');

  /** Patches the annotation style for the current selection. */
  updateStyle(patch: Partial<AnnotationStyle>): void {
    const id = this.dataService.selectedAnnotationId();
    if (id) {
      this.dataService.updateAnnotationStyle(id, patch);
    }
  }

  /**
   * Clears every per-annotation override on the selection so the
   * annotation falls back to the original label and global styling.
   */
  revertOverrides(): void {
    const id = this.dataService.selectedAnnotationId();
    if (!id) {
      return;
    }
    this.analyticsService.trackButtonClicked('revert_annotation_style', 'annotation');
    this.dataService.resetAnnotationStyle(id, undefined);
  }

  /**
   * Clears a single override on the selected annotation so just that
   * control falls back to its global value. The dedicated `customLabel`
   * field reverts to the WCS-resolved `annotation.label`.
   */
  clearField(field: keyof AnnotationStyle): void {
    const id = this.dataService.selectedAnnotationId();
    if (!id) {
      return;
    }
    this.dataService.clearAnnotationStyleField(id, field);
  }

  /** Sets the per-annotation circle opacity (slider emits 0–100, model stores 0–1). */
  setCircleOpacity(value: number): void {
    this.updateStyle({ opacity: Math.max(0, Math.min(100, value)) / 100 });
  }

  /** Sets the per-annotation label opacity (slider emits 0–100, model stores 0–1). */
  setLabelOpacity(value: number): void {
    this.updateStyle({ labelOpacity: Math.max(0, Math.min(100, value)) / 100 });
  }

  /** Handles edits to the custom-label input. */
  onLabelInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    const original = this.annotation()?.label ?? '';
    this.analyticsService.trackButtonClicked('edit_annotation', 'annotation');
    this.updateStyle({ customLabel: value && value !== original ? value : undefined });
  }
}
