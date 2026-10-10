// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { setStructuredData } from './structured-data.util';

describe('setStructuredData', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('writes a single application/ld+json script with the serialized data', () => {
    setStructuredData(document, { '@type': 'WebSite', name: 'Celestory' });
    const scripts = document.head.querySelectorAll('script#ld-json');
    expect(scripts.length).toBe(1);
    expect(scripts[0].getAttribute('type')).toBe('application/ld+json');
    expect(JSON.parse(scripts[0].textContent ?? '{}')).toEqual({
      '@type': 'WebSite',
      name: 'Celestory',
    });
  });

  it('replaces the slot contents on a second call (never duplicates)', () => {
    setStructuredData(document, { a: 1 });
    setStructuredData(document, { b: 2 });
    const scripts = document.head.querySelectorAll('script#ld-json');
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent ?? '{}')).toEqual({ b: 2 });
  });

  it('removes the slot when data is null', () => {
    setStructuredData(document, { a: 1 });
    setStructuredData(document, null);
    expect(document.getElementById('ld-json')).toBeNull();
  });
});
