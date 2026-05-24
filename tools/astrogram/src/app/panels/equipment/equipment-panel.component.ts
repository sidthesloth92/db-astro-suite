import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AnalyticsService,
  IconComponent,
  InspectorSectionComponent,
  MicroInputComponent,
  checkIcon,
  closeIcon,
  cpuIcon,
  layersIcon,
  plusIcon,
  telescopeIcon,
  trashIcon,
} from '@db-astro-suite/ui';
import type { EquipmentItem, SoftwareItem } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { PresetService } from '../../services/preset.service';
import type { PresetRow } from './equipment-panel.types';

/**
 * Inspector panel that combines rig presets, equipment rows, and the
 * software pipeline. Presets store both equipment and software and are
 * persisted to localStorage via `PresetService`.
 */
@Component({
  selector: 'dba-ag-equipment-panel',
  standalone: true,
  imports: [InspectorSectionComponent, MicroInputComponent, IconComponent],
  templateUrl: './equipment-panel.component.html',
  styleUrls: ['./equipment-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentPanelComponent {
  private readonly dataService = inject(CardDataService);
  private readonly presetService = inject(PresetService);
  private readonly analyticsService = inject(AnalyticsService);

  /** Current card document. */
  readonly cardData = this.dataService.cardData;

  /** Glyphs used in this panel's template. */
  protected readonly checkIcon = checkIcon;
  protected readonly closeIcon = closeIcon;
  protected readonly cpuIcon = cpuIcon;
  protected readonly layersIcon = layersIcon;
  protected readonly plusIcon = plusIcon;
  protected readonly telescopeIcon = telescopeIcon;
  protected readonly trashIcon = trashIcon;

  /** Local UI signal: name of the preset currently selected (empty = none). */
  readonly selectedPresetName = signal<string>('');
  /** Local UI signal: true while the inline "save preset" input is shown. */
  readonly isSavingPreset = signal<boolean>(false);
  /** Inline draft name for the save-preset flow. */
  readonly draftPresetName = signal<string>('');
  /** Identifies the row whose label is currently in inline-edit mode. */
  readonly editingLabel = signal<{ kind: 'equipment' | 'software'; index: number } | null>(null);

  /**
   * All preset rows for rendering — reactive: recomputes whenever
   * `PresetService.presets` signal changes (save, delete, load).
   */
  readonly presetRows = computed<readonly PresetRow[]>(() => {
    const presets = this.presetService.presets();
    const selected = this.selectedPresetName();
    return Object.entries(presets).map(([name, preset]) => ({
      name,
      note: preset.equipment.map((i) => i.value).filter(Boolean).join(' · '),
      active: name === selected,
    }));
  });

  /** True when a preset is currently selected; gates the Update button. */
  readonly hasSelectedPreset = computed(() => this.selectedPresetName() !== '');

  /** Activates a preset: copies its equipment AND software into the card document. */
  activatePreset(name: string): void {
    const preset = this.presetService.presets()[name];
    if (!preset) return;
    this.analyticsService.trackSettingChanged('equipment_preset', name);
    this.selectedPresetName.set(name);
    this.dataService.mutateData((data) => {
      data.equipment = JSON.parse(JSON.stringify(preset.equipment));
      data.software = JSON.parse(JSON.stringify(preset.software));
    });
  }

  /** Deletes a saved preset by name and clears the selection if it was active. */
  deletePreset(name: string): void {
    this.presetService.deletePreset(name);
    if (this.selectedPresetName() === name) {
      this.selectedPresetName.set('');
    }
  }

  /** Begins the inline save-preset flow. */
  startSavePreset(): void {
    this.draftPresetName.set('');
    this.isSavingPreset.set(true);
  }

  /** Cancels the inline save-preset flow without persisting anything. */
  cancelSavePreset(): void {
    this.isSavingPreset.set(false);
  }

  /** Persists the current equipment + software under the drafted preset name. */
  confirmSavePreset(): void {
    const name = this.draftPresetName().trim();
    if (!name) return;
    this.analyticsService.trackButtonClicked('save_preset', 'equipment');
    this.analyticsService.trackSettingChanged('equipment_preset', name);
    this.presetService.savePreset(
      name,
      this.cardData().equipment,
      this.cardData().software,
    );
    this.selectedPresetName.set(name);
    this.isSavingPreset.set(false);
  }

  /** Writes the current equipment + software back to the selected preset. */
  updateSelectedPreset(): void {
    const name = this.selectedPresetName();
    if (!name) return;
    this.analyticsService.trackButtonClicked('update_preset', 'equipment');
    this.analyticsService.trackSettingChanged('equipment_preset', name);
    this.presetService.savePreset(
      name,
      this.cardData().equipment,
      this.cardData().software,
    );
  }

  /** Sets the inline draft name from a text input event. */
  setDraftName(event: Event): void {
    this.draftPresetName.set((event.target as HTMLInputElement).value);
  }

  // ── Equipment rows ────────────────────────────────────────────────────────

  /** Patches the value field of an equipment row. */
  updateEquipment(index: number, value: string): void {
    this.dataService.mutateData((data) => {
      data.equipment[index] = { ...data.equipment[index], value };
    });
  }

  /** Appends a blank equipment row. */
  addEquipmentRow(): void {
    this.dataService.mutateData((data) => {
      data.equipment = [...data.equipment, { icon: '', label: 'New item', value: '' }];
    });
  }

  /** Removes the equipment row at `index`. */
  removeEquipmentRow(index: number): void {
    this.dataService.mutateData((data) => {
      data.equipment = data.equipment.filter((_, i) => i !== index);
    });
  }

  // ── Software rows ────────────────────────────────────────────────────────

  /** Patches the name field of a software row. */
  updateSoftware(index: number, name: string): void {
    this.dataService.mutateData((data) => {
      data.software[index] = { ...data.software[index], name };
    });
  }

  /** Appends a blank software row. */
  addSoftwareRow(): void {
    this.dataService.mutateData((data) => {
      data.software = [...data.software, { icon: '', label: 'New item', name: '' }];
    });
  }

  /** Removes the software row at `index`. */
  removeSoftwareRow(index: number): void {
    this.dataService.mutateData((data) => {
      data.software = data.software.filter((_, i) => i !== index);
    });
  }

  // ── Inline label editing ─────────────────────────────────────────────────

  /** Returns true when the given row's label is currently in edit mode. */
  isEditingLabel(kind: 'equipment' | 'software', index: number): boolean {
    const editing = this.editingLabel();
    return editing !== null && editing.kind === kind && editing.index === index;
  }

  /** Switches the given row's label into inline-edit mode. */
  startEditLabel(kind: 'equipment' | 'software', index: number): void {
    this.editingLabel.set({ kind, index });
  }

  /** Commits the typed label value and exits edit mode. */
  commitLabel(kind: 'equipment' | 'software', index: number, event: Event): void {
    const label = (event.target as HTMLInputElement).value.trim() || 'New item';
    this.dataService.mutateData((data) => {
      if (kind === 'equipment') {
        data.equipment[index] = { ...data.equipment[index], label };
      } else {
        data.software[index] = { ...data.software[index], label };
      }
    });
    this.editingLabel.set(null);
  }

  /** Exits edit mode without saving. */
  cancelEditLabel(): void {
    this.editingLabel.set(null);
  }
}
