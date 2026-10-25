import { describe, expect, it } from 'vitest';
import { observerName, observerWithName } from './observer-name.util';

describe('observerWithName', () => {
  it('replaces the name and keeps the place', () => {
    expect(observerWithName('Vera — Atacama', 'Vera C.')).toBe('Vera C. — Atacama');
  });

  it('sets just the name when there is no place', () => {
    expect(observerWithName('', 'Vera')).toBe('Vera');
    expect(observerWithName(undefined, '  Vera  ')).toBe('Vera');
    expect(observerWithName('Old Name', 'Vera')).toBe('Vera');
  });
});

describe('observerName', () => {
  it('reads the name part of the line', () => {
    expect(observerName('Vera C. — Atacama')).toBe('Vera C.');
    expect(observerName('Vera')).toBe('Vera');
    expect(observerName(undefined)).toBe('');
  });
});
