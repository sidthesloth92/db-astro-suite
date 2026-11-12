/**
 * Per-app settings for the post-export share prompt. Each app provides one
 * through {@link SHARE_PROMPT_CONFIG} to opt in to the prompt.
 */
export interface SharePromptConfig {
  /** Display name of the app, e.g. `Astrogram`. */
  readonly appName: string;
  /** The app's own hashtag including the `#`, e.g. `#astrogram`. */
  readonly appHashtag: string;
  /** What the app exports, used in the copy, e.g. `card`, `video`, `image`. */
  readonly itemNoun: string;
  /** Storage key holding this app's prompt history. */
  readonly storageKey: string;
}
