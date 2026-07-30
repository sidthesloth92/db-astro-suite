import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  circleHelpIcon,
  IconComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  SegmentedTabsComponent,
  sparklesIcon,
  starsIcon,
  TooltipDirective,
} from '@db-astro-suite/ui';
import { CONTROLS, EDITOR_CONTROL_KEYS } from '../../constants/controls.constants';
import {
  SPIKE_COUNT_BY_TAB_ID,
  SPIKE_COUNT_TABS,
  TAB_ID_BY_SPIKE_COUNT,
} from '../../constants/spike-count.constants';
import { ControlMetadata, EditorControlKey } from '../../models/editor-controls.model';
import { SpikePresetId } from '../../models/spike-preset.model';
import { SpikeEditorService } from '../../services/spike-editor.service';
import { formatControlSuffix, formatControlValue } from '../../utils/control-format.util';
import { ExportControls } from '../export-controls/export-controls';
import { PresetCards } from '../preset-cards/preset-cards';

/**
 * Right-hand controls pane. Groups the whole editor control set into two
 * inspector sections — Preset (a dropdown) and Spikes (the adjustment sliders
 * plus the 4/6 arm toggle) — with export pinned to the foot of the pane.
 *
 * The how-to and the global Reset live in the studio title bar, not here: they
 * act on the whole studio, and this pane is not rendered at all before an image
 * is loaded.
 *
 * Per-star controls are NOT here: they sit in a bar under the stage, so the
 * globals stay visible while one star is being tuned and this pane never opens
 * a void as a star is selected and deselected.
 *
 * Orchestration only: every control delegates straight to
 * {@link SpikeEditorService}; the only state the pane owns is whether its own
 * how-to is expanded.
 */
@Component({
  selector: 'dba-as-control-panel',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ExportControls,
    IconComponent,
    InspectorSectionComponent,
    MicroSliderComponent,
    PresetCards,
    SegmentedTabsComponent,
    TooltipDirective,
  ],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel {
  /** Shared editor state — image meta, stars, controls, and export state. */
  protected readonly editor = inject(SpikeEditorService);

  /** Circle-help glyph rendered next to each slider as the tooltip affordance. */
  protected readonly circleHelpIcon = circleHelpIcon;

  /** Chip glyph for the Preset section. */
  protected readonly sparklesIcon = sparklesIcon;

  /** Chip glyph for the Spikes section. */
  protected readonly starsIcon = starsIcon;

  /** Editor slider keys, in display order. */
  protected readonly controlKeys = EDITOR_CONTROL_KEYS;

  /** Segmented-tab options for the spike arm count. */
  protected readonly spikeCountTabs = SPIKE_COUNT_TABS;

  /** Segmented-tab id matching the editor's current spike arm count. */
  protected readonly spikeCountTabId = computed(
    () => TAB_ID_BY_SPIKE_COUNT[this.editor.spikeCount()],
  );

  /**
   * Slider metadata (label, description, min/max/step) for a control key.
   * @param key The control to describe.
   */
  protected controlMeta(key: EditorControlKey): ControlMetadata {
    return CONTROLS[key];
  }

  /**
   * Current raw value of a slider control.
   * @param key The control to read.
   */
  protected controlValue(key: EditorControlKey): number {
    return this.editor.controls[key]();
  }

  /**
   * Unit-aware readout rendered alongside a slider's label.
   * @param key The control to format.
   */
  protected controlReadout(key: EditorControlKey): string {
    return formatControlValue(key, this.editor.controls[key](), this.editor.allStars().length);
  }

  /**
   * The dimmer trailing part of a readout — the star cut's "of N" total — or an
   * empty string for controls that have none.
   * @param key The control to format.
   */
  protected controlSuffix(key: EditorControlKey): string {
    return formatControlSuffix(key, this.editor.allStars().length);
  }

  /**
   * Forwards a slider drag to the editor. Every drag event is applied live —
   * the render pipeline downstream is already frame-coalesced.
   * @param key The control being dragged.
   * @param value The new numeric value.
   */
  protected onControlChange(key: EditorControlKey, value: number): void {
    this.editor.updateControl(key, value);
  }

  /**
   * Applies the preset the user picked from the cards.
   * @param id The chosen preset.
   */
  protected onPresetSelected(id: SpikePresetId): void {
    this.editor.applyPreset(id);
  }

  /**
   * Overrides the spike arm count from the segmented toggle. The override is
   * independent of the sliders, so it survives every later slider change until
   * another preset is applied.
   * @param tabId The chosen segmented-tab id.
   */
  protected onSpikeCountChange(tabId: string): void {
    this.editor.setSpikeCount(SPIKE_COUNT_BY_TAB_ID[tabId]);
  }

}
