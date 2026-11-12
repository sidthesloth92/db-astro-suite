import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';
import { STORAGE_SERVICE_TOKEN } from '../services/storage.service';
import { SharePromptState } from './share-prompt-state.model';
import { SHARE_PROMPT_CONFIG } from './share-prompt.config';
import { SHARE_PROMPT_SHOW_DELAY_MS } from './share-prompt.constants';
import {
  buildSharePromptTags,
  parseSharePromptState,
  recordSharePromptExport,
  retireSharePrompt,
  snoozeSharePrompt,
} from './share-prompt-policy.util';
import { SharePromptCopyStatus } from './share-prompt.types';

/**
 * Drives the post-export share prompt that asks users to tag their posts
 * with the suite and app hashtags. Apps call {@link notifyExportSucceeded}
 * after every successful export; the service opens the prompt at most once
 * per visit (page load), skips it while a "Maybe later" snooze lasts, and
 * never opens it again once the user opts out. The app root binds the
 * presentational `dba-ui-share-prompt` to its signals.
 *
 * Inert unless the app provides {@link SHARE_PROMPT_CONFIG}. Without a
 * `STORAGE_SERVICE_TOKEN` provider the history lives in memory only.
 */
@Injectable({ providedIn: 'root' })
export class SharePromptService {
  private readonly config = inject(SHARE_PROMPT_CONFIG);
  private readonly storage = inject(STORAGE_SERVICE_TOKEN, { optional: true });
  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly openState = signal(false);
  private readonly copyStatusState = signal<SharePromptCopyStatus>('idle');
  private readonly copiedTagsState = signal<readonly string[]>([]);
  private state: SharePromptState | null = null;
  private hasShownThisVisit = false;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  /** True while the prompt is open. */
  readonly isOpen = this.openState.asReadonly();
  /** Outcome of copying: `copied` once every tag is on the clipboard. */
  readonly copyStatus = this.copyStatusState.asReadonly();
  /** Tags the user has copied individually (or all of them after "Copy all"). */
  readonly copiedTags = this.copiedTagsState.asReadonly();
  /** Display name of the app shown in the prompt. */
  readonly appName = this.config?.appName ?? '';
  /** What the app exports, used in the prompt copy. */
  readonly itemNoun = this.config?.itemNoun ?? '';
  /** Tags the prompt displays and copies. */
  readonly tags: readonly string[] = this.config ? buildSharePromptTags(this.config) : [];

  constructor() {
    this.destroyRef.onDestroy(() => this.clearShowTimer());
  }

  /** Records a successful export and, when the history allows, opens the prompt shortly after. */
  notifyExportSucceeded(): void {
    if (this.config === null || this.openState() || this.showTimer !== null) {
      return;
    }
    const outcome = recordSharePromptExport(this.loadState(), this.hasShownThisVisit);
    this.saveState(outcome.state);
    if (!outcome.shouldShow) {
      return;
    }
    this.hasShownThisVisit = true;
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.copyStatusState.set('idle');
      this.copiedTagsState.set([]);
      this.openState.set(true);
      this.track('share_prompt_shown');
    }, SHARE_PROMPT_SHOW_DELAY_MS);
  }

  /** Copies every tag to the clipboard. */
  async copyTags(): Promise<void> {
    if (!(await this.writeToClipboard(this.tags.join(' ')))) {
      return;
    }
    this.copiedTagsState.set(this.tags);
    this.markCopied('all');
  }

  /**
   * Copies a single tag.
   * @param tag One of {@link tags}.
   */
  async copyTag(tag: string): Promise<void> {
    if (!(await this.writeToClipboard(tag))) {
      return;
    }
    this.copiedTagsState.update((copied) => (copied.includes(tag) ? copied : [...copied, tag]));
    this.markCopied(tag);
  }

  /** Closes the prompt for the rest of this visit; it shows again on the next visit. */
  dismiss(): void {
    if (!this.openState()) {
      return;
    }
    this.openState.set(false);
    this.track('share_prompt_closed');
  }

  /** Closes the prompt and skips it for the next few exports ("Maybe later"). */
  snooze(): void {
    this.openState.set(false);
    this.saveState(snoozeSharePrompt(this.loadState()));
    this.track('share_prompt_later');
  }

  /** Closes the prompt and stops it from ever showing again. */
  optOut(): void {
    this.openState.set(false);
    this.saveState(retireSharePrompt(this.loadState()));
    this.track('share_prompt_opt_out');
  }

  /**
   * Writes text to the clipboard, flagging a failure so the prompt can tell
   * the user to copy by hand.
   * @param text The text to copy.
   * @returns True when the copy succeeded.
   */
  private async writeToClipboard(text: string): Promise<boolean> {
    const clipboard = this.document.defaultView?.navigator?.clipboard;
    if (!clipboard) {
      this.copyStatusState.set('failed');
      return false;
    }
    try {
      await clipboard.writeText(text);
      return true;
    } catch (error) {
      // Clipboard access can be denied; the tags stay selectable in the prompt.
      console.warn('Share prompt: copying tags failed.', error);
      this.copyStatusState.set('failed');
      return false;
    }
  }

  /**
   * Records a successful copy, flipping to the thank-you state once every
   * tag has been copied.
   * @param what `all`, or the single tag that was copied.
   */
  private markCopied(what: string): void {
    const isEveryTagCopied = this.tags.every((tag) => this.copiedTagsState().includes(tag));
    this.copyStatusState.set(isEveryTagCopied ? 'copied' : 'idle');
    this.analytics.trackEvent('share_prompt_copied', { app: this.appName, tags: what });
  }

  /** Returns the cached history, reading it from storage on first use. */
  private loadState(): SharePromptState {
    if (this.state === null) {
      this.state = parseSharePromptState(this.readStored());
    }
    return this.state;
  }

  /** Caches the history and persists it when storage is available. */
  private saveState(next: SharePromptState): void {
    this.state = next;
    if (this.storage === null || this.config === null) {
      return;
    }
    try {
      this.storage.setItem(this.config.storageKey, JSON.stringify(next));
    } catch (error) {
      // Storage can be full or blocked (private mode); the in-memory copy still applies.
      console.warn('Share prompt: saving history failed.', error);
    }
  }

  /** Reads the stored history string, or null when unavailable. */
  private readStored(): string | null {
    if (this.storage === null || this.config === null) {
      return null;
    }
    try {
      return this.storage.getItem(this.config.storageKey);
    } catch (error) {
      // Storage access can throw when blocked; treat it as no history.
      console.warn('Share prompt: reading history failed.', error);
      return null;
    }
  }

  /** Sends a share-prompt analytics event tagged with the app name. */
  private track(eventName: string): void {
    this.analytics.trackEvent(eventName, { app: this.appName });
  }

  /** Cancels a pending delayed open. */
  private clearShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
