import type { CelestoryLedger } from './ledger.model';
import sampleLedger from './sample-celestory.json';

/**
 * A rich, decade-long sample ledger powering the "Explore Vera's Journey" button
 * and the /user/vera demo showcase. Authored as JSON (the single source of truth,
 * also published to /public for download) to the CelestoryLedger contract; the
 * structural JSON import is assignable to the domain type with no cast.
 */
export const SAMPLE_LEDGER: CelestoryLedger = sampleLedger;

/** The reserved handle the bundled demo journey ("Vera") renders under: /user/vera. */
export const SAMPLE_HANDLE = 'vera';
