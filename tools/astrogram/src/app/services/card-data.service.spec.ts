import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_PREVIEW_SIZE_KEY,
  PREVIEW_SIZES,
  type PreviewSizeKey,
} from '../constants/preview-sizes.constants';
import { ImageAnnotation } from '../models/annotation.models';
import { CardDataService } from './card-data.service';

describe('CardDataService', () => {
  let service: CardDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CardDataService);
  });

  describe('updateAnnotationPosition', () => {
    const makeAnnotation = (id: string, xPercent: number, yPercent: number): ImageAnnotation => ({
      id,
      xPercent,
      yPercent,
      radiusDb: 10,
      label: id,
      visible: true,
      source: 'custom',
    });

    beforeEach(() => {
      service.stellarMapData.update((d) => ({
        ...d,
        annotations: [makeAnnotation('a', 50, 50), makeAnnotation('b', 20, 30)],
      }));
    });

    it('should set xPercent and yPercent on the matching annotation', () => {
      service.updateAnnotationPosition('a', 60, 70);

      const updated = service.stellarMapData().annotations.find((a) => a.id === 'a');
      expect(updated?.xPercent).toBe(60);
      expect(updated?.yPercent).toBe(70);
    });

    it('should clamp xPercent and yPercent below 0 to 0', () => {
      service.updateAnnotationPosition('a', -10, -5);

      const updated = service.stellarMapData().annotations.find((a) => a.id === 'a');
      expect(updated?.xPercent).toBe(0);
      expect(updated?.yPercent).toBe(0);
    });

    it('should clamp xPercent and yPercent above 100 to 100', () => {
      service.updateAnnotationPosition('a', 110, 150);

      const updated = service.stellarMapData().annotations.find((a) => a.id === 'a');
      expect(updated?.xPercent).toBe(100);
      expect(updated?.yPercent).toBe(100);
    });

    it('should NOT mutate other annotations', () => {
      service.updateAnnotationPosition('a', 60, 70);

      const other = service.stellarMapData().annotations.find((a) => a.id === 'b');
      expect(other?.xPercent).toBe(20);
      expect(other?.yPercent).toBe(30);
    });

    it('should leave the annotations array unchanged when id is not found', () => {
      const before = service.stellarMapData().annotations;

      service.updateAnnotationPosition('nonexistent', 60, 70);

      const after = service.stellarMapData().annotations;
      expect(after).toEqual(before);
    });
  });

  describe('setPreviewSize', () => {
    it('updates previewSizeKey and mirrors the ratio onto cardData in infographic mode', () => {
      service.activeMode.set('infographic');

      service.setPreviewSize('ig-square');

      expect(service.previewSizeKey()).toBe('ig-square');
      expect(service.cardData().aspectRatio).toBe('1:1');
    });

    it('leaves stellarMapData.aspectRatio untouched even when active mode is stellar-map', () => {
      // Documented behaviour from `card-data.service.ts`: the preview-size
      // preset only reshapes the infographic card. Stellar-map keeps its
      // own aspect (defaults to `auto` = uploaded image's natural size) so
      // picking 1080×1080 here doesn't crop the stellar image.
      service.activeMode.set('stellar-map');
      const stellarRatioBefore = service.stellarMapData().aspectRatio;

      service.setPreviewSize('ig-story');

      expect(service.previewSizeKey()).toBe('ig-story');
      expect(service.stellarMapData().aspectRatio).toBe(stellarRatioBefore);
      // The infographic card still receives the new ratio regardless of active mode.
      expect(service.cardData().aspectRatio).toBe('9:16');
    });

    it('is a no-op when given an unknown preview-size key', () => {
      const keyBefore = service.previewSizeKey();
      const ratioBefore = service.cardData().aspectRatio;

      // Cast required to feed an invalid key — exercising the early-return guard.
      service.setPreviewSize('does-not-exist' as unknown as PreviewSizeKey);

      expect(service.previewSizeKey()).toBe(keyBefore);
      expect(service.cardData().aspectRatio).toBe(ratioBefore);
    });

    it('produces a new cardData reference rather than mutating in place', () => {
      const before = service.cardData();

      service.setPreviewSize('ig-square');

      const after = service.cardData();
      expect(after).not.toBe(before);
      expect(after.aspectRatio).toBe('1:1');
    });

    it('mirrors every preset ratio defined in PREVIEW_SIZES', () => {
      for (const [key, meta] of Object.entries(PREVIEW_SIZES)) {
        // `Object.entries` widens keys to `string`; cast back to the literal union.
        const typedKey = key as PreviewSizeKey;
        service.setPreviewSize(typedKey);
        expect(service.cardData().aspectRatio).toBe(meta.ratio);
        expect(service.previewSizeKey()).toBe(typedKey);
      }
    });
  });

  describe('previewSizeKey signal', () => {
    it('defaults to DEFAULT_PREVIEW_SIZE_KEY on construction', () => {
      expect(service.previewSizeKey()).toBe(DEFAULT_PREVIEW_SIZE_KEY);
    });

    it('cardData.aspectRatio default matches the default preview-size preset', () => {
      // Sanity guard so the default preset key + default aspectRatio stay in sync.
      const defaultRatio = PREVIEW_SIZES[DEFAULT_PREVIEW_SIZE_KEY].ratio;
      expect(service.cardData().aspectRatio).toBe(defaultRatio);
    });
  });

  describe('exportFormat signal', () => {
    it("defaults to 'jpeg'", () => {
      expect(service.exportFormat()).toBe('jpeg');
    });

    it('updates when set to png', () => {
      service.exportFormat.set('png');
      expect(service.exportFormat()).toBe('png');
    });

    it('updates when set to webp', () => {
      service.exportFormat.set('webp');
      expect(service.exportFormat()).toBe('webp');
    });
  });

  describe('secondaryAccentColor', () => {
    it("defaults to '#00E5FF' on cardData", () => {
      expect(service.cardData().secondaryAccentColor).toBe('#00E5FF');
    });

    it('is updatable through updateData and produces a new cardData reference', () => {
      const before = service.cardData();

      service.updateData({ secondaryAccentColor: '#123456' });

      const after = service.cardData();
      expect(after).not.toBe(before);
      expect(after.secondaryAccentColor).toBe('#123456');
    });

    it('preserves other cardData fields when only secondaryAccentColor changes', () => {
      const titleBefore = service.cardData().title;
      const accentBefore = service.cardData().accentColor;

      service.updateData({ secondaryAccentColor: '#abcdef' });

      const after = service.cardData();
      expect(after.title).toBe(titleBefore);
      expect(after.accentColor).toBe(accentBefore);
      expect(after.secondaryAccentColor).toBe('#abcdef');
    });
  });
});
