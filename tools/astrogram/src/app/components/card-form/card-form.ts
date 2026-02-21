import { Component, Input, Output, EventEmitter, signal, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  CardData, 
  FilterExposure, 
  EquipmentItem, 
  SoftwareItem,
  DEFAULT_FILTERS 
} from '../../models/card-data';
import { 
  NeonButtonComponent, 
  AccordionComponent, 
  AccordionItemComponent,
  SliderComponent,
  InputComponent,
  TextareaComponent,
  SelectComponent
} from '@db-astro-suite/ui';
import { AstroInfoService } from '../../services/astro-info.service';
import { PresetService } from '../../services/preset.service';

@Component({
  selector: 'ac-card-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NeonButtonComponent, 
    AccordionComponent, 
    AccordionItemComponent,
    SliderComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './card-form.html',
  styleUrl: './card-form.css',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CardFormComponent implements OnInit {
  @Input() data!: CardData;
  @Output() dataChange = new EventEmitter<CardData>();

  isFetching = false;

  // Preset UI State
  presetOptions: { label: string, value: string }[] = [];
  selectedPresetName: string = '';
  isSavingPreset: boolean = false;
  newPresetName: string = '';
  isDeletingPreset: boolean = false;

  constructor(
    private astroInfo: AstroInfoService,
    private presetService: PresetService
  ) {}

  ngOnInit() {
    this.loadPresets();
  }

  // Preset Management Methods
  loadPresets() {
    const presets = this.presetService.getEquipmentPresets();
    const names = Object.keys(presets);
    
    // Create options for dropdown. Empty option at top if no selection
    this.presetOptions = [
      { label: '-- Select Preset --', value: '' },
      ...names.map(name => ({ label: name, value: name }))
    ];
  }

  onPresetChange() {
    if (!this.selectedPresetName) return;
    
    const presets = this.presetService.getEquipmentPresets();
    const selectedData = presets[this.selectedPresetName];
    
    if (selectedData) {
      // Deep copy to avoid reference issues
      this.data.equipment = JSON.parse(JSON.stringify(selectedData));
      this.emitChange();
    }
  }

  // Saving Inline Actions
  startSavePreset() {
    this.isSavingPreset = true;
    this.newPresetName = '';
    this.isDeletingPreset = false; // ensure mutually exclusive
  }

  confirmSavePreset() {
    if (!this.newPresetName.trim()) return;
    
    this.presetService.saveEquipmentPreset(this.newPresetName.trim(), this.data.equipment);
    this.loadPresets();
    this.selectedPresetName = this.newPresetName.trim();
    this.isSavingPreset = false;
  }

  cancelSavePreset() {
    this.isSavingPreset = false;
  }

  // Deleting Inline Actions
  startDeletePreset() {
    if (!this.selectedPresetName) return;
    this.isDeletingPreset = true;
    this.isSavingPreset = false; // ensure mutually exclusive
  }

  confirmDeletePreset() {
    if (!this.selectedPresetName) return;
    
    this.presetService.deleteEquipmentPreset(this.selectedPresetName);
    this.loadPresets();
    this.selectedPresetName = '';
    this.isDeletingPreset = false;
  }

  cancelDeletePreset() {
    this.isDeletingPreset = false;
  }

  // Emit changes to parent
  emitChange() {
    this.dataChange.emit({ ...this.data });
  }

  onAccentColorChange() {
    // Convert hex to RGB for CSS variable use
    const hex = this.data.accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    this.data.accentColorRgb = `${r}, ${g}, ${b}`;
    this.emitChange();
  }

  // Background image upload
  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.data.backgroundImage = e.target?.result as string;
        this.emitChange();
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  clearBackground() {
    this.data.backgroundImage = null;
    this.emitChange();
  }

  // Filter management
  toggleFilter(index: number) {
    this.data.filters[index].enabled = !this.data.filters[index].enabled;
    this.emitChange();
  }

  updateFilter(index: number, field: keyof FilterExposure, value: any) {
    (this.data.filters[index] as any)[field] = value;
    this.emitChange();
  }

  addCustomFilter() {
    this.data.filters.push({
      name: 'Custom',
      color: '#ff00ff',
      frames: 0,
      seconds: 0,
      enabled: true
    });
    this.emitChange();
  }

  removeFilter(index: number) {
    this.data.filters.splice(index, 1);
    this.emitChange();
  }

  // Equipment management
  addEquipment() {
    this.data.equipment.push({ icon: '🔧', label: 'New', value: '' });
    this.emitChange();
  }

  removeEquipment(index: number) {
    this.data.equipment.splice(index, 1);
    this.emitChange();
  }

  // Software management
  addSoftware() {
    this.data.software.push({ icon: '📦', label: '', name: '' });
    this.emitChange();
  }

  removeSoftware(index: number) {
    this.data.software.splice(index, 1);
    this.emitChange();
  }

  async fetchObjectInfo() {
    if (!this.data.title || this.isFetching) return;
    
    this.isFetching = true;
    try {
      const info = await this.astroInfo.getObjectDescription(this.data.title);
      if (info) {
        this.data.description = info.extract;
        this.emitChange();
      }
    } finally {
      this.isFetching = false;
    }
  }
}
