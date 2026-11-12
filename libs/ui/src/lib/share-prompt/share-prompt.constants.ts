import { SharePromptState } from './share-prompt-state.model';

/** Suite-wide hashtag every app asks users to add. */
export const SHARE_PROMPT_SUITE_HASHTAG = '#dbastrosuite';

/** Instagram account users may tag instead of (or as well as) the hashtags. */
export const SHARE_PROMPT_INSTAGRAM_HANDLE = '@astrowithdb';

/** Delay after a successful export before the prompt opens, so the browser's download notice lands first. */
export const SHARE_PROMPT_SHOW_DELAY_MS = 1000;

/** Successful exports skipped after the user chooses "Maybe later". */
export const SHARE_PROMPT_SNOOZE_EXPORTS = 5;

/** History for a user who has never answered the prompt: it shows on the first export of each visit. */
export const INITIAL_SHARE_PROMPT_STATE: SharePromptState = {
  exportsToSkip: 0,
  isRetired: false,
};
