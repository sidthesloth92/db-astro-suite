import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent, checkIcon, chevronIcon } from '@db-astro-suite/ui';
import { SPIKE_PRESETS, SPIKE_PRESET_ORDER } from '../../constants/spike-presets.constants';
import { SpikePreset, SpikePresetId } from '../../models/spike-preset.model';

/**
 * Preset picker for the diffraction spike style: a trigger row naming the
 * active preset, which expands a list of the three built-ins.
 *
 * A dropdown rather than three permanent cards because the choice is made once
 * and then rarely revisited, while the sliders beneath it are worked
 * constantly — three cards spent the pane's most valuable space on the least
 * used control.
 *
 * Dumb component: the active preset is supplied by the parent and every pick is
 * emitted back out. The only state it owns is whether its own menu is open.
 */
@Component({
  selector: 'dba-as-preset-cards',
  standalone: true,
  imports: [IconComponent, NgTemplateOutlet],
  templateUrl: './preset-cards.html',
  styleUrl: './preset-cards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresetCards {
  /** Id of the preset currently applied to the editor. */
  readonly activeId = input.required<SpikePresetId>();

  /** Emits the preset the user picked. */
  readonly presetSelected = output<SpikePresetId>();

  /** Presets offered in the menu, in display order. */
  protected readonly presets: readonly SpikePreset[] = SPIKE_PRESET_ORDER.map(
    (id) => SPIKE_PRESETS[id],
  );

  /** Chevron glyph on the trigger, rotated when the menu is open. */
  protected readonly chevronIcon = chevronIcon;

  /** Tick glyph marking the selected option. */
  protected readonly checkIcon = checkIcon;

  /** Whether the menu is expanded. */
  protected readonly isOpen = signal(false);

  /** The preset the trigger row describes. */
  protected readonly activePreset = computed(() => SPIKE_PRESETS[this.activeId()]);

  /** Expands or collapses the menu. */
  protected onToggle(): void {
    this.isOpen.update((open) => !open);
  }

  /**
   * Emits the chosen preset and closes the menu.
   * @param id The preset the user picked.
   */
  protected onPick(id: SpikePresetId): void {
    this.isOpen.set(false);
    this.presetSelected.emit(id);
  }
}
