/** Pastel accents a custom band's pill cycles through by position (rose, sky, peach). */
export const HALO_PASTEL_CYCLE: readonly string[] = ['#FFB0CE', '#A8D5FF', '#FFB8A8'];

/**
 * Pastel accent for each known band, keyed by its display id, so a band keeps
 * a colour that reads as itself (R rose, B sky) wherever it sits in the list.
 * The narrowband trio keeps the design source's rose / sky / peach.
 */
export const HALO_BAND_PASTELS: Readonly<Record<string, string>> = {
  L: '#C6B6FF',
  Hα: '#FFB0CE',
  OIII: '#A8D5FF',
  SII: '#FFB8A8',
  R: '#FFB0CE',
  G: '#A8E8D0',
  B: '#A8D5FF',
};
