import { Injectable, signal } from '@angular/core';
import { CardData, DEFAULT_FILTERS } from '../models/card-data';

@Injectable({
  providedIn: 'root'
})
export class CardDataService {
  readonly cardData = signal<CardData>({
    title: 'NGC 2237 - Rosette Nebula',
    description: 'The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn\'t see anything but it was just right there hidden among the stars. Here it is in pink on Valentine\'s Day 🌹',
    date: new Date().toISOString().split('T')[0],
    location: 'Irving, Texas',
    author: '@astrogram',
    filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
    equipment: [
      { icon: '🔭', label: 'Telescope', value: 'Askar 103 APO' },
      { icon: '📷', label: 'Camera', value: 'ZWO ASI2600MM Air' },
      { icon: '🏗️', label: 'Mount', value: 'Sky-Watcher Wave 150i' },
      { icon: '🎯', label: 'Guide Scope and Camera', value: 'SVBony SV106 60mm+ ASI120MM Mini' },
      { icon: '🌈', label: 'Filters', value: 'Astronomik MaxFR 6nm SHO' },
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
    backgroundImage: 'assets/img/rosette.jpg',
    aspectRatio: '3:4',
    hashtags: '#space #astrophotography'
  });

  updateData(newData: Partial<CardData>) {
    this.cardData.update(data => ({ ...data, ...newData }));
  }

  // Helper method for nested updates to maintain immutability and trigger signals
  mutateData(mutator: (data: CardData) => void) {
    this.cardData.update(data => {
      const cloned = JSON.parse(JSON.stringify(data)); // Deep clone to break references
      mutator(cloned);
      return cloned;
    });
  }
}
