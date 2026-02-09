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

@Component({
  selector: 'ac-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CardFormComponent, CardPreviewComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  cardData = signal<CardData>({
    title: 'Pillars of Creation',
    date: new Date().toISOString().split('T')[0],
    location: 'Irving, Texas',
    author: '@dbwithastro',
    filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
    equipment: [
      { icon: '🔭', label: 'Telescope', value: 'Askar 103 APO' },
      { icon: '📷', label: 'Camera', value: 'ZWO ASI2600MM Air' },
      { icon: '🏗️', label: 'Mount', value: 'Sky-Watcher Wave 150i' },
    ],
    software: [
      { icon: '💻', name: 'ASIAIR Plus' },
      { icon: '⚙️', name: 'PixInsight' },
      { icon: '✨', name: 'Photoshop' },
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
