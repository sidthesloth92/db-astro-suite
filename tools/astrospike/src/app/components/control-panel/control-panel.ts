import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
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
import { formatControlValue } from '../../utils/control-format.util';
import { ExportControls } from '../export-controls/export-controls';
import { PresetCards } from '../preset-cards/preset-cards';
import { StarControls } from '../star-controls/star-controls';

/**
 * Right-hand controls pane. Groups the whole editor control set into two
 * inspector sections — Preset (selectable cards) and Spikes (the four
 * adjustment sliders plus the 4/6 arm toggle) — with a collapsible how-to at
 * the top and export pinned to the foot of the pane.
 *
 * Double-clicking a star on the canvas swaps those sections for that star's
 * own controls. They live here rather than in a popover over the canvas so
 * they can never cover the spikes being tuned, and they REPLACE the global
 * controls rather than stacking above them so nothing else on the pane shifts
 * position when a star is opened or closed.
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
    StarControls,
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

  /** Scrollable body of the pane — scrolled to the top when a star opens. */
  private readonly panelScrollRef = viewChild<ElementRef<HTMLElement>>('panelScroll');

  /**
   * Whether the how-to list is expanded. It starts open so a first-time user
   * reads how the canvas works without hunting for it, and collapses for good
   * (this session) the moment they say they have read it.
   */
  protected readonly isHelpOpen = signal(true);

  /** Editor slider keys, in display order. */
  protected readonly controlKeys = EDITOR_CONTROL_KEYS;

  /** Segmented-tab options for the spike arm count. */
  protected readonly spikeCountTabs = SPIKE_COUNT_TABS;

  /** Segmented-tab id matching the editor's current spike arm count. */
  protected readonly spikeCountTabId = computed(
    () => TAB_ID_BY_SPIKE_COUNT[this.editor.spikeCount()],
  );

  /**
   * The star whose controls are docked in the pane, or null when none is open.
   * Resolving the star (rather than passing the bare id around) also keeps the
   * `@if` honest: star id 0 is the brightest star, and a truthiness check on
   * the id alone would hide its controls.
   */
  protected readonly editedStar = computed(() => {
    const id = this.editor.starControlsId();
    if (id === null) {
      return null;
    }
    return this.editor.allStars().find((star) => star.id === id) ?? null;
  });

  /**
   * Effect: bring the docked star controls into view. They render at the top
   * of the pane, which the user may have scrolled away from before
   * double-clicking a star.
   */
  private readonly _revealStarControls = effect(() => {
    if (this.editedStar() === null) {
      return;
    }
    this.panelScrollRef()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  });

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

  /** Dismisses the per-star controls, restoring the global ones. */
  protected onCloseStarControls(): void {
    this.editor.closeStarControls();
  }

  /** Expands or collapses the how-to list under the pane header. */
  protected onToggleHelp(): void {
    this.isHelpOpen.update((open) => !open);
  }
}
