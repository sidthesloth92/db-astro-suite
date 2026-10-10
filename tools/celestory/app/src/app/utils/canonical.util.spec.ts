// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { setCanonicalUrl } from './canonical.util';

describe('setCanonicalUrl', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('creates a single canonical link pointing at the url', () => {
    setCanonicalUrl(document, 'https://celestory.app/user/vera');
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://celestory.app/user/vera');
  });

  it('updates the existing link instead of duplicating it', () => {
    setCanonicalUrl(document, 'https://celestory.app/a');
    setCanonicalUrl(document, 'https://celestory.app/b');
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://celestory.app/b');
  });

  it('is a no-op for a falsy url', () => {
    setCanonicalUrl(document, null);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
