/** Landing upload flow states: dropzone → choice → create form → created. */
export type LandingMode = 'idle' | 'choice' | 'create' | 'created';

/** CLI install channel shown in the "Get started" walkthrough. */
export type InstallTool = 'brew' | 'scoop';
