/**
 * Field-of-view presets the user can pick to hint the plate-solver at the
 * frame's angular scale. Narrowing the solver's scale range speeds up the
 * solve; `Auto` keeps the full blind range and is the safe default.
 *
 * The string values are the exact tokens the Astrosolve API expects in the
 * `fov_preset` multipart field — keep them in sync with the server's
 * `FOV_PRESET` constant.
 */
export enum FovPreset {
  /** Let the solver search the full scale range (safe default). */
  Auto = 'auto',
  /** Very wide fields — short focal lengths (~135–300mm). */
  Wide = 'wide',
  /** Medium fields — mid focal lengths (~300–900mm). */
  Medium = 'medium',
  /** Narrow fields — long focal lengths (900mm+). */
  Narrow = 'narrow',
}

/**
 * A selectable FOV preset paired with its display label and a focal-length
 * helper line, for rendering the dropdown.
 */
export interface FovPresetOption {
  /** The preset value sent to the API. */
  readonly value: FovPreset;
  /** Short label shown in the dropdown. */
  readonly label: string;
  /** Focal-length helper text shown beneath the dropdown. */
  readonly focalLengthHint: string;
}

/**
 * Ordered options for the FOV dropdown. `Auto` leads so it is the default.
 */
export const FOV_PRESET_OPTIONS: readonly FovPresetOption[] = [
  { value: FovPreset.Auto, label: 'Auto', focalLengthHint: 'Detect field size automatically' },
  { value: FovPreset.Wide, label: 'Wide', focalLengthHint: 'Short focal length · ~135–300mm' },
  { value: FovPreset.Medium, label: 'Medium', focalLengthHint: 'Mid focal length · ~300–900mm' },
  { value: FovPreset.Narrow, label: 'Narrow', focalLengthHint: 'Long focal length · 900mm+' },
] as const;
