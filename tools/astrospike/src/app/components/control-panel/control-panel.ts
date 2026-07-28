import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  circleHelpIcon,
  IconComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  SegmentedTabsComponent,
  sparklesIcon,
  starsIcon,
  TextButtonComponent,
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
import { formatControlValue } from '../../utils/control-format.util';
import { ExportControls } from '../export-controls/export-controls';
import { PresetCards } from '../preset-cards/preset-cards';

/**
 * Right-hand controls pane. Groups the whole editor control set into three
 * inspector sections — Preset (selectable cards), Spikes (the four adjustment
 * sliders plus the 4/6 arm toggle), and Export — above the loaded image's
 * metadata and a "New image" reset.
 *
 * Orchestration only: every control delegates straight to
 * {@link SpikeEditorService}, and the pane holds no state of its own.
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
    TextButtonComponent,
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

  /**
   * Star-count line. Reports progress while detection is in flight so the
   * panel never claims "0 stars detected" before the run has finished.
   */
  protected readonly starSummary = computed(() =>
    this.editor.isDetecting()
      ? 'Detecting stars…'
      : `${this.editor.allStars().length} stars detected`,
  );

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

  /** Clears the loaded image and resets the editor to its empty state. */
  protected onClearImage(): void {
    this.editor.clearImage();
  }
}
