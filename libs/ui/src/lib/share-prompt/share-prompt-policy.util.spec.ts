import { INITIAL_SHARE_PROMPT_STATE, SHARE_PROMPT_SNOOZE_EXPORTS } from './share-prompt.constants';
import { SharePromptState } from './share-prompt-state.model';
import {
  buildSharePromptTags,
  parseSharePromptState,
  recordSharePromptExport,
  retireSharePrompt,
  snoozeSharePrompt,
} from './share-prompt-policy.util';

/**
 * Runs `count` exports in one visit from `start`, returning the final state
 * and which exports showed the prompt.
 */
function runVisit(start: SharePromptState, count: number): { state: SharePromptState; shownAt: number[] } {
  let state = start;
  let hasShown = false;
  const shownAt: number[] = [];
  for (let i = 1; i <= count; i++) {
    const outcome = recordSharePromptExport(state, hasShown);
    state = outcome.state;
    if (outcome.shouldShow) {
      hasShown = true;
      shownAt.push(i);
    }
  }
  return { state, shownAt };
}

describe('share prompt policy', () => {
  it('should show on the first export of a visit and not again in that visit', () => {
    expect(runVisit(INITIAL_SHARE_PROMPT_STATE, 8).shownAt).toEqual([1]);
  });

  it('should show again on the first export of every new visit', () => {
    const first = runVisit(INITIAL_SHARE_PROMPT_STATE, 3);
    expect(runVisit(first.state, 3).shownAt).toEqual([1]);
  });

  it('should skip the configured number of exports after "Maybe later", across visits', () => {
    const snoozed = snoozeSharePrompt(INITIAL_SHARE_PROMPT_STATE);
    const firstVisit = runVisit(snoozed, 2);
    expect(firstVisit.shownAt).toEqual([]);
    const secondVisit = runVisit(firstVisit.state, SHARE_PROMPT_SNOOZE_EXPORTS);
    expect(secondVisit.shownAt).toEqual([SHARE_PROMPT_SNOOZE_EXPORTS - 1]);
  });

  it('should never show once retired', () => {
    const retired = retireSharePrompt(INITIAL_SHARE_PROMPT_STATE);
    expect(runVisit(retired, 20).shownAt).toEqual([]);
  });

  it('should not mutate the state it is given', () => {
    const start = { ...INITIAL_SHARE_PROMPT_STATE, exportsToSkip: 2 };
    recordSharePromptExport(start, false);
    snoozeSharePrompt(start);
    retireSharePrompt(start);
    expect(start).toEqual({ ...INITIAL_SHARE_PROMPT_STATE, exportsToSkip: 2 });
  });

  it('should start fresh when nothing is stored', () => {
    expect(parseSharePromptState(null)).toEqual(INITIAL_SHARE_PROMPT_STATE);
  });

  it('should read back stored history', () => {
    const stored: SharePromptState = { exportsToSkip: 3, isRetired: true };
    expect(parseSharePromptState(JSON.stringify(stored))).toEqual(stored);
  });

  it('should start fresh when the stored value is corrupt or malformed', () => {
    expect(parseSharePromptState('{not json')).toEqual(INITIAL_SHARE_PROMPT_STATE);
    expect(parseSharePromptState('{"exportsToSkip":"2","isRetired":false}')).toEqual(
      INITIAL_SHARE_PROMPT_STATE,
    );
    expect(parseSharePromptState('null')).toEqual(INITIAL_SHARE_PROMPT_STATE);
  });

  it('should list the suite hashtag, the app hashtag, then the Instagram account', () => {
    const tags = buildSharePromptTags({
      appName: 'Starwizz',
      appHashtag: '#starwizz',
      itemNoun: 'video',
      storageKey: 'k',
    });
    expect(tags).toEqual(['#dbastrosuite', '#starwizz', '@astrowithdb']);
  });
});
