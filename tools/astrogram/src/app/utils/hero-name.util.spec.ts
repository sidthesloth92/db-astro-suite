import { splitHeroName } from './hero-name.util';

describe('splitHeroName', () => {
  it('should set the first word large when a descriptor follows it', () => {
    expect(splitHeroName('Rosette Nebula')).toEqual({ primary: 'Rosette', rest: 'Nebula' });
    expect(splitHeroName('Orion Nebula')).toEqual({ primary: 'Orion', rest: 'Nebula' });
  });

  it('should keep a multi-word proper name whole', () => {
    expect(splitHeroName('North America Nebula Complex')).toEqual({
      primary: 'North America',
      rest: 'Nebula Complex',
    });
    expect(splitHeroName('Heart and Soul Nebula')).toEqual({ primary: 'Heart and Soul', rest: 'Nebula' });
    expect(splitHeroName('M31 Andromeda Galaxy')).toEqual({ primary: 'M31 Andromeda', rest: 'Galaxy' });
  });

  it('should keep a name with no descriptor whole', () => {
    expect(splitHeroName('Andromeda')).toEqual({ primary: 'Andromeda', rest: '' });
    expect(splitHeroName('Pillars of Creation')).toEqual({ primary: 'Pillars of Creation', rest: '' });
  });

  it('should not split before a descriptor that starts the name', () => {
    expect(splitHeroName('Cluster')).toEqual({ primary: 'Cluster', rest: '' });
  });

  it('should match descriptors regardless of case and punctuation', () => {
    expect(splitHeroName('VEIL NEBULA, EAST')).toEqual({ primary: 'VEIL', rest: 'NEBULA, EAST' });
  });

  it('should collapse stray whitespace', () => {
    expect(splitHeroName('  Crescent   Nebula ')).toEqual({ primary: 'Crescent', rest: 'Nebula' });
    expect(splitHeroName('')).toEqual({ primary: '', rest: '' });
  });
});
