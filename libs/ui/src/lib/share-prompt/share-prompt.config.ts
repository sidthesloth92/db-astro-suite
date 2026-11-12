import { InjectionToken } from '@angular/core';
import { SharePromptConfig } from './share-prompt-config.model';

/**
 * Opts an app in to the post-export share prompt. Provide it in the app's
 * `app.config.ts`. Defaults to `null`, which keeps the prompt switched off
 * (so test beds and apps that never provide it are unaffected).
 */
export const SHARE_PROMPT_CONFIG = new InjectionToken<SharePromptConfig | null>(
  'SharePromptConfig',
  { providedIn: 'root', factory: () => null },
);
