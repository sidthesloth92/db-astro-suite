import { describe, expect, it } from 'vitest';
import { buildSitemapXml, toLastmod } from './sitemap.util';

describe('buildSitemapXml', () => {
  it('wraps entries in a urlset with loc + optional lastmod', () => {
    const xml = buildSitemapXml([
      { loc: 'https://celestory.app/' },
      { loc: 'https://celestory.app/user/vera', lastmod: '2026-01-02' },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://celestory.app/</loc>');
    expect(xml).toContain('<loc>https://celestory.app/user/vera</loc>');
    expect(xml).toContain('<lastmod>2026-01-02</lastmod>');
  });

  it('XML-escapes reserved characters in the loc', () => {
    const xml = buildSitemapXml([{ loc: 'https://celestory.app/user/a&b' }]);
    expect(xml).toContain('a&amp;b');
    expect(xml).not.toContain('a&b</loc>');
  });
});

describe('toLastmod', () => {
  it('reduces a timestamp to a YYYY-MM-DD date', () => {
    expect(toLastmod('2026-06-21T10:42:00.000Z')).toBe('2026-06-21');
    expect(toLastmod('2026-06-21')).toBe('2026-06-21');
  });

  it('returns undefined for empty or unparseable input', () => {
    expect(toLastmod('')).toBeUndefined();
    expect(toLastmod(null)).toBeUndefined();
    expect(toLastmod('not-a-date')).toBeUndefined();
  });
});
