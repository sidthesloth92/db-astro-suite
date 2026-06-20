import { describe, expect, it } from 'vitest';
import { extractRows } from './extract';
import type { EquipmentItem, Story, ObjectTimeline } from './story.types';

/** A minimal valid server-side Story, overridable per test. */
function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    schemaVersion: 2,
    generatedAt: '2026-06-19T00:00:00Z',
    tool: { name: 'celestory', version: 'test' },
    installId: 'install-1',
    dataFingerprint: 'fp-1',
    summary: {
      totalIntegrationSeconds: 0,
      objectCount: 0,
      nightCount: 0,
      lightFrameCount: 0,
      firstLight: '',
      latestSession: '',
      duplicateFileCount: 0,
      duplicateWastedBytes: 0,
      filters: [],
      byCategory: [],
      activity: [],
    },
    equipment: [],
    objects: [],
    duplicates: [],
    skipped: [],
    ...overrides,
  };
}

/** An object timeline with sane defaults; pass sessions/ids per test. */
function makeObject(overrides: Partial<ObjectTimeline> = {}): ObjectTimeline {
  return {
    id: 'm31',
    displayName: 'Andromeda Galaxy',
    designation: 'M 31',
    aliases: [],
    type: null,
    category: 'Galaxy',
    totalIntegrationSeconds: 0,
    lightFrameCount: 0,
    nightCount: 0,
    firstLight: '',
    latestSession: '',
    filters: [],
    equipmentIds: [],
    sessions: [],
    image: null,
    ...overrides,
  };
}

describe('extractRows — equipment', () => {
  it('carries the canonical id, frame count and telescope specs onto each row', () => {
    const camera: EquipmentItem = {
      id: 'cam-2600mm',
      kind: 'camera',
      subtype: 'mono',
      displayName: 'ZWO ASI2600MM Air',
      focalLengthMm: null,
      fRatio: null,
      totalIntegrationSeconds: 1000,
      lightFrameCount: 50,
      objectCount: 2,
      firstLight: '2025-01-01',
      latestSession: '2025-02-01',
      objectIds: ['m31'],
    };
    const telescope: EquipmentItem = {
      id: 'telescope-redcat-51',
      kind: 'telescope',
      subtype: 'refractor',
      displayName: 'RedCat 51',
      focalLengthMm: 250,
      fRatio: 4.9,
      totalIntegrationSeconds: 800,
      lightFrameCount: 40,
      objectCount: 1,
      firstLight: '',
      latestSession: '',
      objectIds: [],
    };

    const { equipment } = extractRows(makeStory({ equipment: [camera, telescope] }));

    expect(equipment[0]).toMatchObject({
      equipmentId: 'cam-2600mm',
      lightFrameCount: 50,
      focalLengthMm: null,
      fRatio: null,
    });
    expect(equipment[1]).toMatchObject({
      equipmentId: 'telescope-redcat-51',
      lightFrameCount: 40,
      focalLengthMm: 250,
      fRatio: 4.9,
    });
  });
});

describe('extractRows — object months', () => {
  it('buckets sessions by object and month, summing seconds and frames', () => {
    const object = makeObject({
      sessions: [
        { date: '2025-09-10', integrationSeconds: 300, lightFrameCount: 5, filters: [], equipmentIds: [], focalLengthMm: null, fRatio: null },
        { date: '2025-09-20', integrationSeconds: 200, lightFrameCount: 3, filters: [], equipmentIds: [], focalLengthMm: null, fRatio: null },
        { date: '2025-10-01', integrationSeconds: 100, lightFrameCount: 2, filters: [], equipmentIds: [], focalLengthMm: null, fRatio: null },
      ],
    });

    const { objectMonths } = extractRows(makeStory({ objects: [object] }));

    expect(objectMonths).toHaveLength(2);
    const september = objectMonths.find((m) => m.month === '2025-09-01');
    const october = objectMonths.find((m) => m.month === '2025-10-01');
    expect(september).toMatchObject({
      objectId: 'm31',
      designation: 'M 31',
      category: 'Galaxy',
      integrationSeconds: 500,
      lightFrameCount: 8,
    });
    expect(october).toMatchObject({ integrationSeconds: 100, lightFrameCount: 2 });
  });

  it('skips sessions with no parseable date', () => {
    const object = makeObject({
      sessions: [
        { date: '', integrationSeconds: 999, lightFrameCount: 9, filters: [], equipmentIds: [], focalLengthMm: null, fRatio: null },
        { date: '2025-10-01', integrationSeconds: 100, lightFrameCount: 2, filters: [], equipmentIds: [], focalLengthMm: null, fRatio: null },
      ],
    });

    const { objectMonths } = extractRows(makeStory({ objects: [object] }));

    expect(objectMonths).toHaveLength(1);
    expect(objectMonths[0]).toMatchObject({ month: '2025-10-01', integrationSeconds: 100 });
  });

  it('falls back to the display name when an object has no designation', () => {
    const object = makeObject({
      id: 'custom-target',
      designation: '',
      displayName: 'Backyard Nebula',
      sessions: [
        { date: '2025-08-05', integrationSeconds: 60, lightFrameCount: 1, filters: [], equipmentIds: [], focalLengthMm: null, fRatio: null },
      ],
    });

    const { objectMonths } = extractRows(makeStory({ objects: [object] }));

    expect(objectMonths[0].designation).toBe('Backyard Nebula');
  });
});
