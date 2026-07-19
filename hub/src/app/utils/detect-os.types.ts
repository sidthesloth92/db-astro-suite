/** Operating systems Sortronomy publishes an install one-liner for. */
export type InstallOs = 'mac' | 'windows' | 'linux';

/** A detected OS, or `''` when detection is inconclusive (unknown UA / SSR). */
export type DetectedOs = InstallOs | '';
