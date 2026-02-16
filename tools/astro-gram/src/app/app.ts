import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardFormComponent } from './components/card-form/card-form';
import { CardPreviewComponent } from './components/card-preview/card-preview';
import { 
  CardData, 
  DEFAULT_FILTERS,
  ASPECT_RATIOS
} from './models/card-data';

import { HeaderComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'ac-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CardFormComponent, CardPreviewComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  cardData = signal<CardData>({
    title: 'NGC 2237 - Rosette Nebula',
    description: 'The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn\'t see anything but it was just right there hidden among the stars. Here it is in pink on Valentine\'s Day 🌹',
    date: new Date().toISOString().split('T')[0],
    location: 'Irving, Texas',
    author: '@astrowithdb',
    filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
    equipment: [
      { icon: '\uD83D\uDD2D', label: 'Telescope', value: 'Askar 103 APO' },
      { icon: '\uD83D\uDCF7', label: 'Camera', value: 'ZWO ASI2600MM Air' },
      { icon: '\uD83C\uDFD7\uFE0F', label: 'Mount', value: 'Sky-Watcher Wave 150i' },
      { icon: '\uD83C\uDFAF', label: 'Guide Scope and Camera', value: 'SVBony SV106 60mm+ ASI120MM Mini' },
      { icon: '\uD83C\uDF08', label: 'Filters', value: 'Astronomik MaxFR 6nm SHO' },
    ],
    software: [
      { icon: '💻', label: 'Computer', name: 'ASIAIR' },
      { icon: '⚙️', label: 'Editing', name: 'PixInsight + Photoshop' },
      { icon: '✨', label: 'Processing', name: 'Seti Astro Suite' },
    ],
    bortleScale: 9,
    accentColor: '#ff2d95',
    accentColorRgb: '255, 45, 149',
    cardOpacity: 0.60,
    backgroundImage: null,
    aspectRatio: '3:4'
  });

  onDataChange(newData: CardData) {
    this.cardData.set(newData);
  }
}
