import { SharePromptConfig } from './share-prompt-config.model';
import { SharePromptExportOutcome, SharePromptState } from './share-prompt-state.model';
import {
  INITIAL_SHARE_PROMPT_STATE,
  SHARE_PROMPT_INSTAGRAM_HANDLE,
  SHARE_PROMPT_SNOOZE_EXPORTS,
  SHARE_PROMPT_SUITE_HASHTAG,
} from './share-prompt.constants';

/**
 * Counts one successful export and decides whether the prompt shows for it.
 * The prompt shows at most once per visit (page load), never once retired,
 * and not while a "Maybe later" snooze still has exports left to skip.
 * @param state History before the export.
 * @param hasShownThisVisit True when the prompt already showed during this visit.
 * @returns The updated history and whether to show the prompt.
 */
export function recordSharePromptExport(
  state: SharePromptState,
  hasShownThisVisit: boolean,
): SharePromptExportOutcome {
  if (state.isRetired) {
    return { state, shouldShow: false };
  }
  if (state.exportsToSkip > 0) {
    return { state: { ...state, exportsToSkip: state.exportsToSkip - 1 }, shouldShow: false };
  }
  return { state, shouldShow: !hasShownThisVisit };
}

/**
 * Snoozes the prompt for the next {@link SHARE_PROMPT_SNOOZE_EXPORTS} exports.
 * @param state Current history.
 * @returns A snoozed copy of the history.
 */
export function snoozeSharePrompt(state: SharePromptState): SharePromptState {
  return { ...state, exportsToSkip: SHARE_PROMPT_SNOOZE_EXPORTS };
}

/**
 * Marks the history so the prompt never shows again.
 * @param state Current history.
 * @returns A retired copy of the history.
 */
export function retireSharePrompt(state: SharePromptState): SharePromptState {
  return { ...state, isRetired: true };
}

/**
 * Reads stored history, falling back to a fresh history when nothing is
 * stored or the stored value is not valid history (e.g. hand-edited).
 * @param raw The stored string, or null when absent.
 * @returns The parsed history.
 */
export function parseSharePromptState(raw: string | null): SharePromptState {
  if (raw === null) {
    return INITIAL_SHARE_PROMPT_STATE;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      // A corrupt entry only costs the user one extra prompt; start over.
      return INITIAL_SHARE_PROMPT_STATE;
    }
    throw error;
  }
  return isSharePromptState(value) ? value : INITIAL_SHARE_PROMPT_STATE;
}

/**
 * Builds the tags the prompt displays and copies: the suite hashtag, the
 * app's hashtag, then the Instagram handle.
 * @param config The app's prompt settings.
 * @returns The tags in display order.
 */
export function buildSharePromptTags(config: SharePromptConfig): readonly string[] {
  return [SHARE_PROMPT_SUITE_HASHTAG, config.appHashtag, SHARE_PROMPT_INSTAGRAM_HANDLE];
}

/**
 * Narrows an unknown parsed value to {@link SharePromptState}.
 * @param value The parsed value.
 * @returns True when every field has the expected type.
 */
function isSharePromptState(value: unknown): value is SharePromptState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  // Safe: `value` is a non-null object here, and each field is type-checked below.
  const candidate = value as Record<string, unknown>;
  return (
    Number.isInteger(candidate['exportsToSkip']) && typeof candidate['isRetired'] === 'boolean'
  );
}
