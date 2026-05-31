import { ImageAnnotation } from '../models/annotation.models';
import { isNamedAnnotation } from './annotation-named.util';

/** Builds a minimal annotation with sensible defaults for the fields under test. */
function makeAnnotation(overrides: Partial<ImageAnnotation>): ImageAnnotation {
  return {
    id: 'x',
    xPercent: 50,
    yPercent: 50,
    radiusDb: 10,
    label: '',
    visible: true,
    ...overrides,
  };
}

describe('isNamedAnnotation', () => {
  describe('named objects (true)', () => {
    it('treats a Messier object with catalogue aliases as named', () => {
      const ann = makeAnnotation({
        name: 'M 81',
        label: 'M 81',
        catalog: 'M',
        aliases: [{ name: 'NGC 3031' }, { name: 'PGC 28630' }],
      });
      expect(isNamedAnnotation(ann)).toBe(true);
    });

    it('treats an NGC designation as named', () => {
      expect(isNamedAnnotation(makeAnnotation({ name: 'NGC 3031', label: 'NGC 3031' }))).toBe(true);
    });

    it('treats an IC designation as named', () => {
      expect(isNamedAnnotation(makeAnnotation({ name: 'IC 63', label: 'IC 63' }))).toBe(true);
    });

    it('treats a Sharpless designation as named', () => {
      expect(isNamedAnnotation(makeAnnotation({ name: 'Sh2-155', label: 'Sh2-155' }))).toBe(true);
    });

    it('treats any object with a common name as named', () => {
      const ann = makeAnnotation({ name: 'PGC 12345', commonName: 'Orion Nebula' });
      expect(isNamedAnnotation(ann)).toBe(true);
    });

    it('treats an HD star as named', () => {
      expect(
        isNamedAnnotation(makeAnnotation({ name: 'HD 46105', catalog: 'HD', type: 'Star' })),
      ).toBe(true);
    });

    it('recognises a named designation that appears only in the aliases', () => {
      const ann = makeAnnotation({
        name: 'PGC 28630',
        label: 'PGC 28630',
        aliases: [{ name: 'NGC 3031' }],
      });
      expect(isNamedAnnotation(ann)).toBe(true);
    });
  });

  describe('un-named clutter (false)', () => {
    it('rejects an anonymous Gaia field star', () => {
      const ann = makeAnnotation({ name: 'Gaia DR3 1234567890', label: 'Gaia DR3 1234567890', type: 'Star' });
      expect(isNamedAnnotation(ann)).toBe(false);
    });

    it('rejects a standalone PGC galaxy with no catalogue alias or common name', () => {
      expect(isNamedAnnotation(makeAnnotation({ name: 'PGC 28630', label: 'PGC 28630' }))).toBe(false);
    });

    it('rejects a bracketed survey designation', () => {
      const ann = makeAnnotation({ name: '[ZBF2015] NGC6207 41', label: '[ZBF2015] NGC6207 41' });
      expect(isNamedAnnotation(ann)).toBe(false);
    });

    it('rejects a 2MASS coordinate designation', () => {
      const ann = makeAnnotation({ name: '2MASS J09553318+6903549', label: '2MASS J09553318+6903549' });
      expect(isNamedAnnotation(ann)).toBe(false);
    });
  });
});
