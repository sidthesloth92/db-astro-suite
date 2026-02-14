import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
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
  templateUrl: './card-form.html',
  styleUrl: './card-form.css',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CardFormComponent {
  @Input() data!: CardData;
  @Output() dataChange = new EventEmitter<CardData>();

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
}
