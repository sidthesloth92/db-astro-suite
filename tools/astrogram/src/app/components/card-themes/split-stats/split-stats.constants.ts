/**
 * Object names longer than this set a smaller landscape headline. At the
 * designed 64px a two-word line of a long name ("Nebula Complex") is wider
 * than the landscape title column, so the name took three lines and pushed
 * the content fit to shrink the whole card; short names keep 64px.
 */
export const SPLIT_STATS_LONG_NAME_CHARS = 18;
