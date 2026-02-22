import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectComponent, NeonButtonComponent } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { PresetService } from '../../services/preset.service';

@Component({
  selector: 'dba-ag-equipment-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  template: `
    <div class="form-container">
      <!-- Preset Toolbar -->
      <div class="preset-toolbar">
        @if (!isSavingPreset && !isDeletingPreset) {
          <div class="preset-select-group">
            <dba-ui-select
              [value]="selectedPresetName"
              (valueChange)="onPresetChange($event)"
              [options]="presetOptions"
              class="preset-select"
              [noBox]="true"
            ></dba-ui-select>

            <button
              type="button"
              class="action-icon-btn"
              (click)="startSavePreset()"
              title="Save Current Preset"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </button>

            @if (selectedPresetName) {
              <button
                type="button"
                class="action-icon-btn delete"
                (click)="startDeletePreset()"
                title="Delete Preset"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            }
          </div>
        }

        @if (isSavingPreset) {
          <div class="preset-inline-action">
            <input
              type="text"
              class="db-form-input preset-name-input"
              placeholder="Enter preset name..."
              [(ngModel)]="newPresetName"
              (keyup.enter)="confirmSavePreset()"
              autofocus
            />
            <button type="button" class="action-icon-btn confirm" (click)="confirmSavePreset()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button type="button" class="action-icon-btn cancel" (click)="cancelSavePreset()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        }

        @if (isDeletingPreset) {
          <div class="preset-inline-action delete-confirm">
            <span class="confirm-text">Delete "{{ selectedPresetName }}"?</span>
            <button type="button" class="action-icon-btn confirm delete-yes" (click)="confirmDeletePreset()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button type="button" class="action-icon-btn cancel" (click)="cancelDeletePreset()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        }
      </div>

      <div class="items-editor">
        @for (item of cardData().equipment; track $index; let i = $index) {
          <div class="equipment-row-complex">
            <input
              type="text"
              [ngModel]="item.icon"
              (ngModelChange)="updateEquipment(i, 'icon', $event)"
              class="icon-picker-mini db-form-input"
              maxlength="10"
            />
            <div class="item-fields">
              <input
                type="text"
                [ngModel]="item.label"
                (ngModelChange)="updateEquipment(i, 'label', $event)"
                class="db-form-input field-label"
                placeholder="Label"
              />
              <input
                type="text"
                [ngModel]="item.value"
                (ngModelChange)="updateEquipment(i, 'value', $event)"
                class="db-form-input field-value"
                placeholder="Value"
              />
            </div>
            <button type="button" class="delete-action-btn" (click)="removeEquipment(i)">✕</button>
          </div>
        }
      </div>

      <button type="button" class="subtle-add-btn" (click)="addEquipment()">
        + Add Equipment
      </button>
    </div>
  `
})
export class EquipmentSettingsComponent implements OnInit {
  dataService = inject(CardDataService);
  presetService = inject(PresetService);
  cardData = this.dataService.cardData;

  presetOptions: { label: string, value: string }[] = [];
  selectedPresetName: string = '';
  isSavingPreset: boolean = false;
  newPresetName: string = '';
  isDeletingPreset: boolean = false;

  ngOnInit() {
    this.loadPresets();
  }

  loadPresets() {
    const presets = this.presetService.getEquipmentPresets();
    const names = Object.keys(presets);
    this.presetOptions = [
      { label: '-- Select Preset --', value: '' },
      ...names.map(name => ({ label: name, value: name }))
    ];
  }

  onPresetChange(value: string | number | boolean) {
    this.selectedPresetName = String(value);
    if (!this.selectedPresetName) return;
    
    const presets = this.presetService.getEquipmentPresets();
    const selectedData = presets[this.selectedPresetName];
    
    if (selectedData) {
      this.dataService.mutateData((data) => {
        data.equipment = JSON.parse(JSON.stringify(selectedData));
      });
    }
  }

  startSavePreset() { this.isSavingPreset = true; this.newPresetName = ''; this.isDeletingPreset = false; }
  confirmSavePreset() {
    if (!this.newPresetName.trim()) return;
    this.presetService.saveEquipmentPreset(this.newPresetName.trim(), this.cardData().equipment);
    this.loadPresets();
    this.selectedPresetName = this.newPresetName.trim();
    this.isSavingPreset = false;
  }
  cancelSavePreset() { this.isSavingPreset = false; }

  startDeletePreset() { if (!this.selectedPresetName) return; this.isDeletingPreset = true; this.isSavingPreset = false; }
  confirmDeletePreset() {
    if (!this.selectedPresetName) return;
    this.presetService.deleteEquipmentPreset(this.selectedPresetName);
    this.loadPresets();
    this.selectedPresetName = '';
    this.isDeletingPreset = false;
  }
  cancelDeletePreset() { this.isDeletingPreset = false; }

  updateEquipment(index: number, field: string, value: any) {
    this.dataService.mutateData((data) => {
      (data.equipment[index] as any)[field] = value;
    });
  }

  addEquipment() {
    this.dataService.mutateData((data) => {
      data.equipment.push({ icon: '🔧', label: 'New', value: '' });
    });
  }

  removeEquipment(index: number) {
    this.dataService.mutateData((data) => {
      data.equipment.splice(index, 1);
    });
  }
}
