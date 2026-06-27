import { describe, expect, it } from 'vitest';
import type { StoryDetails } from '../models/api.model';
import { SAMPLE_STORY } from '../models/sample-story.constants';
import { profileShareMeta } from './profile-share-meta.util';

const ORIGIN = 'https://celestory.app';
const profile: StoryDetails = {
  handle: 'vera',
  story: SAMPLE_STORY,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const noFocus = { object: null, equipment: null };

describe('profileShareMeta', () => {
  it('builds a brand-first whole-journey title + absolute share URLs', () => {
    const meta = profileShareMeta(profile, noFocus, ORIGIN);
    expect(meta.title.startsWith("Celestory — @vera's journey ·")).toBe(true);
    expect(meta.title).toContain(' h under the stars');
    expect(meta.type).toBe('profile');
    expect(meta.url).toBe(`${ORIGIN}/user/vera`);
    expect(meta.image).toBe(`${ORIGIN}/api/og/user/vera`);
  });

  it('builds a brand-first, object-focused title + ?object= URLs', () => {
    const object = SAMPLE_STORY.objects[0];
    const meta = profileShareMeta(profile, { object: object.id, equipment: null }, ORIGIN);
    expect(meta.title.startsWith('Celestory — ')).toBe(true);
    expect(meta.title).toContain('by @vera');
    expect(meta.title).toContain(object.displayName);
    expect(meta.type).toBe('article');
    expect(meta.url).toContain(`/user/vera?object=${object.id}`);
    expect(meta.image).toContain(`/api/og/user/vera?object=${object.id}`);
  });

  it('builds a brand-first, equipment-focused title + ?equipment= URLs', () => {
    const equipment = SAMPLE_STORY.equipment[0];
    const meta = profileShareMeta(profile, { object: null, equipment: equipment.id }, ORIGIN);
    expect(meta.title.startsWith('Celestory — ')).toBe(true);
    expect(meta.title).toContain('by @vera');
    expect(meta.title).toContain(equipment.displayName);
    expect(meta.type).toBe('article');
    expect(meta.url).toContain(`/user/vera?equipment=${equipment.id}`);
  });

  it('leads every variant with the brand so tabs never read as a bare handle', () => {
    const object = SAMPLE_STORY.objects[0];
    const equipment = SAMPLE_STORY.equipment[0];
    const titles = [
      profileShareMeta(profile, noFocus, ORIGIN).title,
      profileShareMeta(profile, { object: object.id, equipment: null }, ORIGIN).title,
      profileShareMeta(profile, { object: null, equipment: equipment.id }, ORIGIN).title,
    ];
    for (const title of titles) {
      expect(title.startsWith('Celestory — ')).toBe(true);
    }
  });

  it('omits absolute URLs when the origin is unknown (SSR with no base)', () => {
    const meta = profileShareMeta(profile, noFocus, null);
    expect(meta.url).toBeUndefined();
    expect(meta.image).toBeUndefined();
  });
});
