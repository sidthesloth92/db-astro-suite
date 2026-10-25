import { describe, expect, it } from 'vitest';
import {
  displayIdentity,
  publishName,
  shareCardIdentity,
} from './display-identity.util';
import type { CelestoryStory } from '../models/story.model';
import type { ViewerIdentity } from '../models/session.types';

/** A story whose saved name is "Vera C." (with a place). */
const story = { observer: 'Vera C. — Atacama', site: '' } as unknown as CelestoryStory;
/** A story with no saved name, as the CLI writes it. */
const unnamed = {} as unknown as CelestoryStory;
/** What a visitor once typed into their own browser. */
const visitor: ViewerIdentity = { name: 'Someone Else', username: 'someone' };
const none: ViewerIdentity = { name: '', username: '' };

describe('displayIdentity', () => {
  it('shows the profile’s own name on a published profile, never the visitor’s', () => {
    expect(displayIdentity('published', story, 'vera', visitor)).toEqual({ name: 'Vera C.', username: 'vera' });
  });

  it('falls back to the handle when a published profile has no saved name', () => {
    expect(displayIdentity('published', unnamed, 'vera', visitor)).toEqual({ name: 'vera', username: 'vera' });
  });

  it('shows the sample’s own identity on the demo', () => {
    expect(displayIdentity('demo', story, 'vera', visitor)).toEqual({ name: 'Vera C.', username: 'vera' });
  });

  it('lets the viewer’s own edits win in preview', () => {
    expect(displayIdentity('preview', story, '', visitor)).toEqual({ name: 'Someone Else', username: 'someone' });
    expect(displayIdentity('preview', story, '', none).name).toBe('Vera C.');
  });
});

describe('shareCardIdentity', () => {
  it('uses the viewer’s saved identity in preview', () => {
    expect(shareCardIdentity(true, visitor, story, '', {})).toBe(visitor);
  });

  it('uses the profile’s identity elsewhere, with card-only edits on top', () => {
    expect(shareCardIdentity(false, visitor, story, 'vera', {})).toEqual({ name: 'Vera C.', username: 'vera' });
    expect(shareCardIdentity(false, visitor, story, 'vera', { name: 'Vera' })).toEqual({ name: 'Vera', username: 'vera' });
  });
});

describe('publishName', () => {
  it('prefers the viewer’s edited name, then the file’s own, else nothing', () => {
    expect(publishName(story, { name: ' Vera R. ', username: '' })).toBe('Vera R.');
    expect(publishName(story, none)).toBe('Vera C.');
    expect(publishName(unnamed, none)).toBe('');
  });
});
