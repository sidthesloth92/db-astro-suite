import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ColorSwatchInputComponent,
  IconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  SwitchComponent,
  tagIcon,
  targetIcon,
} from '@db-astro-suite/ui';
import type { GlobalAnnotationSettings } from '../../models/annotation-settings.models';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel that drives the global annotation style: circle
 * colour / thickness / opacity, plus label colour / size / opacity and
 * the show-magnitude toggle. Replaces `AnnotationSettingsComponent`.
 */
@Component({
  selector: 'dba-ag-annotation-style-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    ColorSwatchInputComponent,
    MicroSliderComponent,
    SwitchComponent,
    IconComponent,
  ],
  templateUrl: './annotation-style-panel.component.html',
  styleUrls: ['./annotation-style-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationStylePanelComponent {
  private readonly dataService = inject(CardDataService);

  /** Current global annotation settings. */
  readonly settings = computed(() => this.dataService.stellarMapData().globalAnnotationSettings);

  /** Glyphs rendered next to the Circle and Label section titles. */
  protected readonly targetIcon = targetIcon;
  protected readonly tagIcon = tagIcon;

  /** Circle opacity as 0–100 for the slider readout. */
  readonly circleOpacityPercent = computed(() => Math.round(this.settings().circleOpacity * 100));
  /** Label opacity as 0–100 for the slider readout. */
  readonly labelOpacityPercent = computed(() => Math.round(this.settings().labelOpacity * 100));

  /** Generic patcher over the GlobalAnnotationSettings. */
  update(patch: Partial<GlobalAnnotationSettings>): void {
    this.dataService.updateGlobalAnnotationSettings(patch);
  }

  /** Sets the circle opacity (slider emits 0–100, model stores 0–1). */
  setCircleOpacity(value: number): void {
    this.update({ circleOpacity: Math.max(0, Math.min(100, value)) / 100 });
  }

  /** Sets the label opacity (slider emits 0–100, model stores 0–1). */
  setLabelOpacity(value: number): void {
    this.update({ labelOpacity: Math.max(0, Math.min(100, value)) / 100 });
  }
}
