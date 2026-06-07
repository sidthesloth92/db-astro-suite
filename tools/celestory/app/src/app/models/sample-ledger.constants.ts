import type { CelestoryLedger } from './ledger.model';

/** A small, realistic sample ledger powering the "Explore sample data" button. */
export const SAMPLE_LEDGER: CelestoryLedger = {
  schemaVersion: 1,
  summary: {
    totalIntegrationSeconds: 672360,
    objectCount: 19,
    nightCount: 64,
    lightFrameCount: 2619,
    firstLight: '2025-02-01',
    latestSession: '2026-05-06',
    filters: [
      { name: 'Hα', seconds: 144300 },
      { name: 'OIII', seconds: 143400 },
      { name: 'L', seconds: 137700 },
      { name: 'SII', seconds: 70200 },
      { name: 'R', seconds: 67200 },
      { name: 'G', seconds: 60000 },
      { name: 'B', seconds: 49560 },
    ],
  },
  objects: [
    {
      id: 'm31',
      displayName: 'Andromeda Galaxy',
      designation: 'M 31',
      category: 'Galaxy',
      totalIntegrationSeconds: 9540,
      lightFrameCount: 70,
      nightCount: 3,
    },
    {
      id: 'm27',
      displayName: 'Dumbbell Nebula',
      designation: 'M 27',
      category: 'Planetary Nebula',
      totalIntegrationSeconds: 72600,
      lightFrameCount: 242,
      nightCount: 6,
    },
    {
      id: 'ngc2237',
      displayName: 'Rosette Nebula',
      designation: 'NGC 2237',
      category: 'Nebula',
      totalIntegrationSeconds: 151560,
      lightFrameCount: 421,
      nightCount: 9,
    },
  ],
  equipment: [
    {
      id: 'cam-2600mm',
      kind: 'camera',
      displayName: 'ZWO ASI2600MM Pro',
      totalIntegrationSeconds: 307380,
    },
    {
      id: 'optic-esprit-120',
      kind: 'optic',
      displayName: 'Sky-Watcher Esprit 120',
      totalIntegrationSeconds: 320700,
    },
  ],
};
