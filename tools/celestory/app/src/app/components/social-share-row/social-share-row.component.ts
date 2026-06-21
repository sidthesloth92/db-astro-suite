import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { SocialShareLink } from '../../models/social-share.model';
import { socialShareLinks } from '../../utils/social-share.util';
import { copyToClipboard } from '../../utils/clipboard.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { SocialIconComponent } from '../social-icon/social-icon.component';

/**
 * Presentational social-share row: a chain-link "copy URL" button followed by
 * per-platform share-intent links (X, Facebook, Reddit, WhatsApp, Telegram,
 * Email) for the given public URL. Shared by the published-journey banner and
 * the object / gear share modals. No HTTP, no store — driven entirely by `url`.
 */
@Component({
  selector: 'dba-cel-social-share-row',
  standalone: true,
  imports: [CelIconComponent, SocialIconComponent],
  templateUrl: './social-share-row.component.html',
  styleUrl: './social-share-row.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialShareRowComponent {
  /** Absolute public URL to copy / share (and which unfurls into the OG card). */
  readonly url = input.required<string>();
  /** When true, shows the URL + a labelled Copy button + "or share to" above the icons. */
  readonly showUrl = input<boolean>(false);

  /** Per-platform share-intent links for the current URL. */
  protected readonly links = computed<SocialShareLink[]>(() => socialShareLinks(this.url()));
  /** The URL without its scheme, for compact display. */
  protected readonly displayUrl = computed<string>(() => this.url().replace(/^https?:\/\//, ''));
  /** Flashes a ✓ on the copy-link button briefly after a successful copy. */
  protected readonly copied = signal(false);

  /** Copy the URL to the clipboard and flash feedback. */
  copyLink(): void {
    void copyToClipboard(this.url()).then((ok) => {
      if (!ok) {
        return;
      }
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1400);
    });
  }
}
