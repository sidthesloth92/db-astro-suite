import { Injectable, signal } from '@angular/core';
import type { EquipmentItem, SoftwareItem } from '../models/card-data.model';
import type { PresetsRecord, RigPreset } from './preset.types';

export type { PresetsRecord, RigPreset };

@Injectable({
  providedIn: 'root',
})
export class PresetService {
  private readonly STORAGE_KEY = 'astrogram_equipment_presets';

  /** Reactive signal — components can read this directly to auto-update on changes. */
  readonly presets = signal<PresetsRecord>(this.loadFromStorage());

  /** Returns all saved presets (same as the signal value, for one-shot reads). */
  getPresets(): PresetsRecord {
    return this.presets();
  }

  /** Saves (or overwrites) a rig preset by name, persisting equipment + software. */
  savePreset(name: string, equipment: EquipmentItem[], software: SoftwareItem[]): void {
    const next: PresetsRecord = {
      ...this.presets(),
      [name]: {
        equipment: JSON.parse(JSON.stringify(equipment)),
        software: JSON.parse(JSON.stringify(software)),
      },
    };
    this.persist(next);
  }

  /** Removes a preset by name. No-op if the name does not exist. */
  deletePreset(name: string): void {
    const current = { ...this.presets() };
    if (!(name in current)) return;
    delete current[name];
    this.persist(current);
  }

  private persist(record: PresetsRecord): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(record));
    } catch {
      // localStorage unavailable — signal update still proceeds
    }
    this.presets.set(record);
  }

  private loadFromStorage(): PresetsRecord {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return {};
      const parsed: Record<string, unknown> = JSON.parse(raw);
      const record: PresetsRecord = {};
      for (const [name, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
          // Migrate old format (EquipmentItem[]) — no software stored yet.
          record[name] = { equipment: value as EquipmentItem[], software: [] };
        } else {
          record[name] = value as RigPreset;
        }
      }
      return record;
    } catch {
      return {};
    }
  }
}
