import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AnalyticsService,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  TargetIconComponent,
  TrashIconComponent,
} from '@db-astro-suite/ui';
import type { AnnotationStyle } from '../../models/annotation-settings.models';
import type { ImageAnnotation } from '../../models/annotation.models';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel that exposes per-annotation overrides (label / size /
 * thickness) and the delete action for the currently-selected
 * annotation. Renders an empty state when no annotation is selected.
 * Replaces `AnnotationDetailComponent`.
 */
@Component({
  selector: 'dba-ag-annotation-selected-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    MicroSliderComponent,
    TargetIconComponent,
    TrashIconComponent,
  ],
  templateUrl: './annotation-selected-panel.component.html',
  styleUrls: ['./annotation-selected-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationSelectedPanelComponent {
  private readonly dataService = inject(CardDataService);
  private readonly analyticsService = inject(AnalyticsService);

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

  /** Patches the annotation style for the current selection. */
  updateStyle(patch: Partial<AnnotationStyle>): void {
    const id = this.dataService.selectedAnnotationId();
    if (id) {
      this.dataService.updateAnnotationStyle(id, patch);
    }
  }

  /** Handles edits to the custom-label input. */
  onLabelInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    const original = this.annotation()?.label ?? '';
    this.analyticsService.trackButtonClicked('edit_annotation', 'annotation');
    this.updateStyle({ customLabel: value && value !== original ? value : undefined });
  }

  /** Deletes the currently-selected annotation. */
  removeAnnotation(): void {
    const id = this.dataService.selectedAnnotationId();
    if (id) {
      this.dataService.removeAnnotation(id);
    }
  }
}
