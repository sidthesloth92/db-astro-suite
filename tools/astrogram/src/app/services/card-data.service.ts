import { Injectable, signal } from '@angular/core';
import { AnnotationStyle, GlobalAnnotationSettings } from '../models/annotation-settings.models';
import { ImageAnnotation } from '../models/annotation.models';
import {
  CardData,
  DEFAULT_FILTERS,
  DEFAULT_GLOBAL_ANNOTATION_SETTINGS,
  StellarMapData,
} from '../models/card-data';

@Injectable({
  providedIn: 'root',
})
export class CardDataService {
  readonly cardData = signal<CardData>({
    title: 'NGC 2237 - Rosette Nebula',
    description:
      "The first ever nebula that I shot was the Rosette. Here it is in pink on Valentine's Day 🌹",
    caption:
      "The first ever nebula that I shot was the Rosette. I still remember looking at the first frame as it came through in disbelief, as to how to the naked eye I couldn't see anything but it was just right there hidden among the stars.",
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
    pixelSize: 3.76, // ASI2600MM pixel size
    focalLength: null,
    accentColor: '#ff2d95',
    accentColorRgb: '255, 45, 149',
    cardOpacity: 0.6,
    backgroundImage: 'assets/img/rosette.jpg',
    aspectRatio: '3:4',
    hashtags: '#space #astrophotography',
    annotations: [],
  });

  readonly activeMode = signal<'infographic' | 'stellar-map'>('infographic');

  readonly stellarMapData = signal<StellarMapData>({
    backgroundImage: null,
    rawFile: null,
    aspectRatio: 'auto',
    annotations: [],
    filters: {
      showMessier: true,
      showNGC: true,
      showIC: true,
      showCaldwell: true,
      showSharpless: true,
      showAbellClusters: true,
      showGalaxies: true,
      showOpenClusters: true,
      showGlobularClusters: true,
      showPlanetaryNebulae: true,
      showNebulae: true,
      showQuasars: true,
      showNamedStars: true,
      showHDStars: true,
      maxStarMagnitude: 7,
    },
    globalAnnotationSettings: { ...DEFAULT_GLOBAL_ANNOTATION_SETTINGS },
  });

  /**
   * Transient UI selection — lives outside StellarMapData because selection
   * is ephemeral view state, not part of the persisted document model.
   */
  readonly selectedAnnotationId = signal<string | null>(null);

  selectAnnotation(id: string | null) {
    this.selectedAnnotationId.set(id);
  }

  updateGlobalAnnotationSettings(patch: Partial<GlobalAnnotationSettings>) {
    this.stellarMapData.update((d) => ({
      ...d,
      globalAnnotationSettings: { ...d.globalAnnotationSettings, ...patch },
    }));
  }

  updateAnnotationStyle(id: string, patch: Partial<AnnotationStyle>) {
    this.stellarMapData.update((d) => ({
      ...d,
      annotations: d.annotations.map((ann) =>
        ann.id === id ? { ...ann, style: { ...(ann.style ?? {}), ...patch } } : ann,
      ),
    }));
  }

  clearAnnotationStyleField(id: string, field: keyof AnnotationStyle) {
    this.stellarMapData.update((d) => ({
      ...d,
      annotations: d.annotations.map((ann) => {
        if (ann.id !== id || !ann.style) return ann;
        const { [field]: _removed, ...rest } = ann.style;
        return {
          ...ann,
          style: Object.keys(rest).length > 0 ? (rest as AnnotationStyle) : undefined,
        };
      }),
    }));
  }

  removeAnnotation(id: string) {
    this.selectedAnnotationId.set(null);
    this.stellarMapData.update((d) => ({
      ...d,
      annotations: d.annotations.filter((ann) => ann.id !== id),
    }));
  }

  addAnnotation(ann: ImageAnnotation) {
    this.stellarMapData.update((d) => ({ ...d, annotations: [...d.annotations, ann] }));
    this.selectedAnnotationId.set(ann.id);
  }

  updateData(newData: Partial<CardData>) {
    this.cardData.update((data) => ({ ...data, ...newData }));
  }

  // Helper method for nested updates to maintain immutability and trigger signals
  mutateData(mutator: (data: CardData) => void) {
    this.cardData.update((data) => {
      const cloned = JSON.parse(JSON.stringify(data)); // Deep clone to break references
      mutator(cloned);
      return cloned;
    });
  }
}
