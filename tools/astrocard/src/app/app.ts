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
    title: 'M81 - Bode\'s Galaxy',
    description: 'My first ever attempt at HaLRGB composite. I’ve been diving deep into the world of HaLRGB processing lately. It’s a lot of hours at the computer trying to process it, Infact I spend more time processing than capturing!!! But seeing this result makes the learning curve worth it. Onwards and upwards! 🚀',
    date: new Date().toISOString().split('T')[0],
    location: 'Irving, Texas',
    author: '@astrowithdb',
    filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
    equipment: [
      { icon: '🔭', label: 'Telescope', value: 'Askar 103 APO' },
      { icon: '📷', label: 'Camera', value: 'ZWO ASI2600MM Air' },
      { icon: '🏗️', label: 'Mount', value: 'Sky-Watcher Wave 150i' },
      { icon: '🌈', label: 'Filters', value: 'Antlia LRGB + 3nm Ha/OIII/SII' },
    ],
    software: [
      { icon: '💻', label: 'Capture', name: 'ASIAIR' },
      { icon: '⚙️', label: 'Processing', name: 'PixInsight + Photoshop' },
      { icon: '✨', label: 'Suite', name: 'Seti Astro Suite' },
    ],
    bortleScale: 9,
    accentColor: '#ff2d95',
    backgroundImage: null,
    aspectRatio: '4:5'
  });

  onDataChange(newData: CardData) {
    this.cardData.set(newData);
  }
}
