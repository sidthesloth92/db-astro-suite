import { seededRandom } from './seeded-random.util';

describe('seededRandom', () => {
  it('should repeat the same sequence for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('should give a different sequence for a different seed', () => {
    const a = seededRandom(1);
    const b = seededRandom(2);
    const same = Array.from({ length: 10 }, () => a() === b()).every(Boolean);
    expect(same).toBeFalse();
  });

  it('should stay within zero (inclusive) and one (exclusive) and spread across the range', () => {
    const next = seededRandom(7);
    let low = 0;
    for (let i = 0; i < 2000; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      if (v < 0.5) low++;
    }
    expect(low).toBeGreaterThan(800);
    expect(low).toBeLessThan(1200);
  });
});
