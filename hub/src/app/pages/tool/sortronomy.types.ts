/**
 * The visitor's detected operating system, used to highlight the matching
 * command in the Sortronomy install dialog. Empty string when unknown
 * (e.g. during SSR, before detection runs).
 */
export type DetectedOs = 'mac' | 'windows' | 'linux' | '';
