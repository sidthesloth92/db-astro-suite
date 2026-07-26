import { describe, expect, it } from 'vitest';
import type { StoryDetails } from '../models/api.model';
import { SAMPLE_STORY } from '../models/sample-story.constants';
import { profileJsonLd, websiteJsonLd } from './json-ld.util';

describe('websiteJsonLd', () => {
  it('builds a WebSite + Organization graph at the given origin', () => {
    const json = JSON.stringify(websiteJsonLd('https://celestory.app'));
    expect(json).toContain('"@context":"https://schema.org"');
    expect(json).toContain('"@type":"WebSite"');
    expect(json).toContain('"@type":"Organization"');
    expect(json).toContain('"url":"https://celestory.app"');
    expect(json).toContain('"logo":"https://celestory.app/icon-512.png"');
  });

  it('drops empty url/logo when the origin is unknown', () => {
    const json = JSON.stringify(websiteJsonLd(''));
    expect(json).not.toContain('"url"');
    expect(json).not.toContain('"logo"');
  });
});

describe('profileJsonLd', () => {
  const profile: StoryDetails = {
    handle: 'vera',
    story: SAMPLE_STORY,
    createdAt: '2026-01-01',
  };

  it('builds a ProfilePage keyed on the handle', () => {
    const json = JSON.stringify(profileJsonLd(profile, 'https://celestory.app/user/vera'));
    expect(json).toContain('"@type":"ProfilePage"');
    expect(json).toContain('"url":"https://celestory.app/user/vera"');
    expect(json).toContain('"@type":"Person"');
    expect(json).toContain('"name":"@vera"');
    expect(json).toContain('"alternateName":"vera"');
  });

  it('omits the url when none is available', () => {
    const json = JSON.stringify(profileJsonLd(profile, null));
    expect(json).not.toContain('"url"');
  });
});
