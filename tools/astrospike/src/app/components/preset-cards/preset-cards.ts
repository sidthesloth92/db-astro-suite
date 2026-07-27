import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SPIKE_PRESETS, SPIKE_PRESET_ORDER } from '../../constants/spike-presets.constants';
import { SpikePreset, SpikePresetId } from '../../models/spike-preset.model';

/**
 * Preset picker for the diffraction spike style. Renders one selectable card
 * per built-in preset (Subtle, Classic, JWST) with a glyph hinting the arm
 * count, the preset name, and its description.
 *
 * Dumb component: the active preset is supplied by the parent and every click
 * is emitted back out — it holds no state and injects no services.
 */
@Component({
  selector: 'dba-as-preset-cards',
  standalone: true,
  templateUrl: './preset-cards.html',
  styleUrl: './preset-cards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresetCards {
  /** Id of the preset currently applied to the editor. */
  readonly activeId = input.required<SpikePresetId>();

  /** Emits the preset the user picked. */
  readonly presetSelected = output<SpikePresetId>();

  /** Presets rendered as cards, in display order. */
  protected readonly presets: readonly SpikePreset[] = SPIKE_PRESET_ORDER.map(
    (id) => SPIKE_PRESETS[id],
  );
}
