import {
  HALO_BAND_PASTELS,
  HALO_PASTEL_CYCLE,
} from '../components/card-themes/halo/halo.constants';

/**
 * Halo's pastel accent for an integration band: the band's own pastel when it
 * is a known filter, otherwise the next colour in the rose / sky / peach cycle
 * for its position.
 *
 * @param bandId The band's display id (`Hα`, `OIII`, `R`, …).
 * @param index The band's position in the integration list.
 */
export function haloBandPastel(bandId: string, index: number): string {
  return (
    HALO_BAND_PASTELS[bandId] ??
    HALO_BAND_PASTELS[bandId.toUpperCase()] ??
    HALO_PASTEL_CYCLE[index % HALO_PASTEL_CYCLE.length]
  );
}
