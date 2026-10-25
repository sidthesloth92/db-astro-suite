import { describe, expect, it } from 'vitest';
import { StarCatalogFormatError } from '../models/sky-assets.error';
import { countBrighterThan, decodeStar, parseStarCatalog } from './star-catalog.util';

function pack(stars: { x: number; y: number; z: number; mag: number; bv: number }[]): ArrayBuffer {
  const buf = new ArrayBuffer(8 + stars.length * 8);
  const v = new DataView(buf);
  v.setUint8(0, 'S'.charCodeAt(0));
  v.setUint8(1, 'T'.charCodeAt(0));
  v.setUint8(2, 'R'.charCodeAt(0));
  v.setUint8(3, '1'.charCodeAt(0));
  v.setUint32(4, stars.length, true);
  stars.forEach((s, i) => {
    const o = 8 + i * 8;
    v.setInt16(o, Math.round(s.x * 32767), true);
    v.setInt16(o + 2, Math.round(s.y * 32767), true);
    v.setInt16(o + 4, Math.round(s.z * 32767), true);
    v.setUint8(o + 6, Math.round((s.mag + 2) * 10));
    v.setInt8(o + 7, Math.round(s.bv * 50));
  });
  return buf;
}

describe('star-catalog.util', () => {
  const stars = [
    { x: 1, y: 0, z: 0, mag: -1.44, bv: 0.0 },
    { x: 0, y: 1, z: 0, mag: 0.03, bv: 0.0 },
    { x: 0, y: 0, z: 1, mag: 2.5, bv: 1.2 },
    { x: 0.6, y: 0.8, z: 0, mag: 6.5, bv: -0.2 },
  ];

  it('parses a valid catalogue and decodes records', () => {
    const cat = parseStarCatalog(pack(stars));
    expect(cat.count).toBe(4);
    const s = decodeStar(cat, 2);
    expect(s.z).toBeCloseTo(1, 4);
    expect(s.mag).toBeCloseTo(2.5, 6);
    expect(s.bv).toBeCloseTo(1.2, 6);
    expect(decodeStar(cat, 0).mag).toBeCloseTo(-1.4, 6);
  });

  it('counts the brightest stars up to a limiting magnitude', () => {
    const cat = parseStarCatalog(pack(stars));
    expect(countBrighterThan(cat, -2)).toBe(0);
    expect(countBrighterThan(cat, 0.03)).toBe(2);
    expect(countBrighterThan(cat, 3)).toBe(3);
    expect(countBrighterThan(cat, 20)).toBe(4);
  });

  it('rejects a file with the wrong magic', () => {
    const buf = pack(stars);
    new DataView(buf).setUint8(0, 'X'.charCodeAt(0));
    expect(() => parseStarCatalog(buf)).toThrow(StarCatalogFormatError);
  });

  it('rejects a truncated file', () => {
    const buf = pack(stars).slice(0, 20);
    expect(() => parseStarCatalog(buf)).toThrow(StarCatalogFormatError);
  });
});
