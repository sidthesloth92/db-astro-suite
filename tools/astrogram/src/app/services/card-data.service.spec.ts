import { TestBed } from '@angular/core/testing';
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
});
