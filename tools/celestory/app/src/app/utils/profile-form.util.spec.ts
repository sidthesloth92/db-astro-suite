import { describe, expect, it } from 'vitest';
import { canSaveProfile, displayNameError } from './profile-form.util';
import type { ProfileSaveState } from '../models/profile-form.model';

/** An unchanged "Edit profile" form for @vera. */
const base: ProfileSaveState = {
  name: 'Vera C.',
  initialName: 'Vera C.',
  handle: 'vera',
  currentHandle: 'vera',
  handleExists: true,
  busy: false,
};

describe('displayNameError', () => {
  it('accepts a normal name and an empty one when a name is optional', () => {
    expect(displayNameError('Vera C.', true)).toBe('');
    expect(displayNameError('', false)).toBe('');
  });

  it('rejects names over 60 characters or containing the place separator', () => {
    expect(displayNameError('x'.repeat(61), false)).toMatch(/at most 60/);
    expect(displayNameError('Vera — Atacama', false)).toMatch(/can’t contain/);
  });

  it('won’t let an existing name be cleared in Edit profile', () => {
    expect(displayNameError('  ', true)).toBe('Enter a display name.');
  });
});

describe('canSaveProfile', () => {
  it('stays disabled until something changes', () => {
    expect(canSaveProfile(base)).toBe(false);
  });

  it('allows a name-only change', () => {
    expect(canSaveProfile({ ...base, name: 'Vera Rubin' })).toBe(true);
  });

  it('allows a handle change only once the new handle is confirmed free', () => {
    expect(canSaveProfile({ ...base, handle: 'vera-r', handleExists: null })).toBe(false);
    expect(canSaveProfile({ ...base, handle: 'vera-r', handleExists: true })).toBe(false);
    expect(canSaveProfile({ ...base, handle: 'vera-r', handleExists: false })).toBe(true);
  });

  it('blocks saving while busy, with an empty handle, or with an invalid name', () => {
    expect(canSaveProfile({ ...base, name: 'Vera Rubin', busy: true })).toBe(false);
    expect(canSaveProfile({ ...base, handle: '', handleExists: false })).toBe(false);
    expect(canSaveProfile({ ...base, name: 'Vera — Rubin' })).toBe(false);
  });
});
