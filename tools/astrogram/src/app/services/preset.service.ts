import { Injectable, signal } from '@angular/core';
import { EquipmentItem } from '../models/card-data';

export interface EquipmentPresets {
  [name: string]: EquipmentItem[];
}

@Injectable({
  providedIn: 'root'
})
export class PresetService {
  private readonly STORAGE_KEY = 'astrogram_equipment_presets';
  
  // Expose presets as a signal for reactive updates if needed
  public presets = signal<EquipmentPresets>(this.loadFromStorage());

  constructor() {}

  /**
   * Retrieves all saved presets from localStorage
   */
  public getEquipmentPresets(): EquipmentPresets {
    return this.loadFromStorage();
  }

  /**
   * Saves a new preset or overwrites an existing one
   */
  public saveEquipmentPreset(name: string, items: EquipmentItem[]): void {
    const current = this.loadFromStorage();
    // Create a deep copy to ensure no references are stored
    current[name] = JSON.parse(JSON.stringify(items));
    this.saveToStorage(current);
  }

  /**
   * Deletes a preset by name
   */
  public deleteEquipmentPreset(name: string): void {
    const current = this.loadFromStorage();
    if (current[name]) {
      delete current[name];
      this.saveToStorage(current);
    }
  }

  private loadFromStorage(): EquipmentPresets {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to load equipment presets from localStorage', e);
      return {};
    }
  }

  private saveToStorage(presets: EquipmentPresets): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));
      this.presets.set(presets);
    } catch (e) {
      console.error('Failed to save equipment presets to localStorage', e);
    }
  }
}
