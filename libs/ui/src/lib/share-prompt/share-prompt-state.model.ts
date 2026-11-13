/**
 * Persisted history that decides whether the share prompt may appear again.
 */
export interface SharePromptState {
  /** Successful exports still to skip after the user chose "Maybe later". */
  readonly exportsToSkip: number;
  /** True once the user chose never to see the prompt again. */
  readonly isRetired: boolean;
}

/**
 * Result of recording one successful export against the prompt history.
 */
export interface SharePromptExportOutcome {
  /** The history after counting the export. */
  readonly state: SharePromptState;
  /** True when the prompt should be shown for this export. */
  readonly shouldShow: boolean;
}
