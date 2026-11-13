import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { IconComponent } from '../icon/icon.component';
import { checkIcon } from '../icons/check.icon';
import { closeIcon } from '../icons/close.icon';
import { copyIcon } from '../icons/copy.icon';
import { SharePromptCopyStatus } from './share-prompt.types';

/**
 * Friendly post-export dialog asking users to add the suite or app hashtag
 * (or tag the Instagram account) when they post what they made. A teary moon
 * peeks over the card; the first copy turns the card into a thank-you and
 * cheers the moon up. Purely
 * presentational: the parent owns the open and copy state and reacts to the
 * `copyTag`, `copyTags`, `dismiss`, `snooze` and `optOut` events. The X,
 * Escape and a backdrop click all dismiss.
 */
@Component({
  selector: 'dba-ui-share-prompt',
  standalone: true,
  imports: [IconButtonComponent, IconComponent],
  templateUrl: './share-prompt.component.html',
  styleUrl: './share-prompt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharePromptComponent {
  /** Whether the dialog is shown. */
  readonly open = input<boolean>(false);
  /** Display name of the app, e.g. `Astrogram`. */
  readonly appName = input.required<string>();
  /** What the app exports, e.g. `card`. */
  readonly itemNoun = input.required<string>();
  /** Tags shown (and copied) in display order. */
  readonly tags = input.required<readonly string[]>();
  /** Outcome of copying: `copied` once every tag is on the clipboard. */
  readonly copyStatus = input<SharePromptCopyStatus>('idle');
  /** Tags already copied, marked with a check on their chip. */
  readonly copiedTags = input<readonly string[]>([]);

  /** Emitted with the tag when the user taps a single tag chip. */
  readonly copyTag = output<string>();
  /** Emitted when the user taps "Copy all tags". */
  readonly copyTags = output<void>();
  /** Emitted when the user closes the dialog (X, Escape or a backdrop click). */
  readonly dismiss = output<void>();
  /** Emitted when the user taps "Maybe later". */
  readonly snooze = output<void>();
  /** Emitted when the user asks never to see the dialog again. */
  readonly optOut = output<void>();

  /** Copy glyph on the primary action. */
  protected readonly copyIcon = copyIcon;
  /** Check glyph shown once the tags are copied. */
  protected readonly checkIcon = checkIcon;
  /** Cross glyph on the top-right close button. */
  protected readonly closeIcon = closeIcon;

  /** True as soon as any tag is copied: the thank-you state with a happy moon. */
  protected readonly isThanked = computed(() => this.copiedTags().length > 0);
  /** True once every tag is copied: the button confirms it. */
  protected readonly isAllCopied = computed(() => this.copyStatus() === 'copied');
  /** True when more than one tag has been copied (plural kicker). */
  protected readonly hasCopiedSeveral = computed(() => this.copiedTags().length > 1);

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Move focus into the dialog when it opens so Escape and Tab work at once.
    effect(() => {
      if (!isPlatformBrowser(this.platformId) || !this.open()) return;
      this.dialog()?.nativeElement.focus();
    });
  }
}
