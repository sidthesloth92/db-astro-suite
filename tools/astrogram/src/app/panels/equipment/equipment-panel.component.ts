import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AnalyticsService,
  CheckIconComponent,
  CpuIconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  LayersIconComponent,
  MicroInputComponent,
  PlusIconComponent,
  TelescopeIconComponent,
} from '@db-astro-suite/ui';
import { EquipmentItem, SoftwareItem } from '../../models/card-data';
import { CardDataService } from '../../services/card-data.service';
import { PresetService } from '../../services/preset.service';

interface PresetRow {
  readonly name: string;
  readonly note: string;
  readonly active: boolean;
}

/**
 * Inspector panel that combines rig presets, equipment rows, and the
 * software pipeline. Replaces the legacy `EquipmentSettingsComponent`
 * and `SoftwareSettingsComponent`. Preset management still flows
 * through `PresetService` and emits analytics through `AnalyticsService`.
 */
@Component({
  selector: 'dba-ag-equipment-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    MicroInputComponent,
    CheckIconComponent,
    LayersIconComponent,
    PlusIconComponent,
    TelescopeIconComponent,
    CpuIconComponent,
  ],
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

  /** Local UI signal: name of the preset currently selected (empty = none). */
  readonly selectedPresetName = signal<string>('');
  /** Local UI signal: true while the inline "save preset" input is shown. */
  readonly isSavingPreset = signal<boolean>(false);
  /** Inline draft name for the save-preset flow. */
  readonly draftPresetName = signal<string>('');

  /** All preset rows for rendering (active flag is derived from selection). */
  readonly presetRows = computed<readonly PresetRow[]>(() => {
    const presets = this.presetService.getEquipmentPresets();
    const selected = this.selectedPresetName();
    return Object.entries(presets).map(([name, items]) => ({
      name,
      note: items.map((i) => i.value).filter(Boolean).join(' · '),
      active: name === selected,
    }));
  });

  /** Activates a preset by name, copying its equipment into the card document. */
  activatePreset(name: string): void {
    const presets = this.presetService.getEquipmentPresets();
    const items = presets[name];
    if (!items) {
      return;
    }
    this.analyticsService.trackSettingChanged('equipment_preset', name);
    this.selectedPresetName.set(name);
    this.dataService.mutateData((data) => {
      data.equipment = JSON.parse(JSON.stringify(items));
    });
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

  /** Persists the current equipment list under the drafted preset name. */
  confirmSavePreset(): void {
    const name = this.draftPresetName().trim();
    if (!name) {
      return;
    }
    this.analyticsService.trackButtonClicked('save_preset', 'equipment');
    this.analyticsService.trackSettingChanged('equipment_preset', name);
    this.presetService.saveEquipmentPreset(name, this.cardData().equipment);
    this.selectedPresetName.set(name);
    this.isSavingPreset.set(false);
  }

  /** Sets the inline draft name from a text input. */
  setDraftName(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.draftPresetName.set(target.value);
  }

  /** Patches a single field on an equipment row by index. */
  updateEquipment(index: number, field: keyof EquipmentItem, value: string): void {
    this.dataService.mutateData((data) => {
      data.equipment[index] = { ...data.equipment[index], [field]: value };
    });
  }

  /** Patches a single field on a software row by index. */
  updateSoftware(index: number, field: keyof SoftwareItem, value: string): void {
    this.dataService.mutateData((data) => {
      data.software[index] = { ...data.software[index], [field]: value };
    });
  }
}
