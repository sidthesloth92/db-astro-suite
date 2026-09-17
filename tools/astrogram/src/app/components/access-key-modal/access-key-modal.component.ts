import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AnalyticsService } from '@db-astro-suite/ui';
import { INSTAGRAM_URL, MIN_ACCESS_KEY_LENGTH, MODAL_STARS } from './access-key-modal.constants';

/**
 * Astro Solve access-key modal. Invites the user to request an access key
 * (via Instagram DM) and lets them paste a key they already have.
 *
 * Starts in the gate/CTA view by default, or jumps straight to the key-entry
 * view when `showError` is true (the previously stored key was rejected).
 */
@Component({
  selector: 'dba-ag-access-key-modal',
  standalone: true,
  templateUrl: './access-key-modal.component.html',
  styleUrl: './access-key-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessKeyModalComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  /** Whether to show an invalid-key error message to the user. */
  showError = input(false);

  /** Emits the trimmed access key string when the user submits the form. */
  submitted = output<string>();

  /** Emits when the user dismisses the modal without submitting. */
  cancelled = output<void>();

  /** Which view is currently shown: the invite gate or the key-entry form. */
  readonly view = signal<'cta' | 'key'>('cta');

  /** Current value of the access-key input field. */
  readonly keyValue = signal('');

  /** Decorative backdrop stars. */
  protected readonly stars = MODAL_STARS;

  /** True until the key input reaches the minimum length, disabling submit. */
  readonly isSubmitDisabled = computed(() => this.keyValue().trim().length < MIN_ACCESS_KEY_LENGTH);

  constructor() {
    effect(() => {
      if (this.showError()) {
        this.view.set('key');
      }
    });
  }

  /** Switches to the key-entry view (e.g. user clicked "Already have a key?"). */
  switchToKey(): void {
    this.view.set('key');
  }

  /** Switches back to the invite gate view. */
  switchToCta(): void {
    this.view.set('cta');
  }

  /** Opens the Instagram profile in a new tab and tracks the conversion. */
  openInstagram(): void {
    this.analyticsService.trackInstagramCtaClicked();
    const win = this.document.defaultView;
    win?.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer');
  }

  /** Syncs the native input's value to the local signal. */
  onKeyInput(event: Event): void {
    this.keyValue.set((event.target as HTMLInputElement).value);
  }

  /** Submits on Enter when the key is long enough. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isSubmitDisabled()) {
      this.onSubmit();
    }
  }

  /** Emits the trimmed key via `submitted` if it meets the minimum length. */
  onSubmit(): void {
    const key = this.keyValue().trim();
    if (key.length >= MIN_ACCESS_KEY_LENGTH) {
      this.analyticsService.trackAccessKeySubmitted(true);
      this.submitted.emit(key);
    } else {
      this.analyticsService.trackAccessKeySubmitted(false);
    }
  }

  /** Emits `cancelled` to let the parent destroy this modal. */
  onCancel(): void {
    this.cancelled.emit();
  }
}
