import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { SessionStore } from '../../services/session-store.service';
import { StoryService } from '../../services/story.service';
import { publishErrorMessage } from '../../utils/publish-error.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/**
 * Owner login for a published profile. Verifies the profile password against the
 * server, and on success records a per-tab management session (handle + token)
 * so the profile page reveals its Edit/Delete controls. Closes itself on success.
 */
@Component({
  selector: 'dba-owner-login-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, CelIconComponent],
  templateUrl: './owner-login-modal.component.html',
  styleUrl: './owner-login-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class OwnerLoginModalComponent {
  private readonly storyService = inject(StoryService);
  private readonly session = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);

  /** The handle the owner is logging in to manage. */
  readonly handle = input.required<string>();

  /** Emitted once the owner session is established. */
  readonly authenticated = output<void>();
  /** Emitted when the modal should close. */
  readonly closed = output<void>();

  /** Password field value. */
  protected readonly password = signal('');
  /** True while the login request is in flight. */
  protected readonly busy = signal(false);
  /** User-facing error, or empty. */
  protected readonly error = signal('');

  /** Track the password input. */
  onPassword(value: string): void {
    this.password.set(value);
    this.error.set('');
  }

  /** Verify the password; on success store the owner session and close. */
  submit(): void {
    const password = this.password();
    if (!password) {
      this.error.set('Enter your profile password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.storyService
      .login(this.handle(), password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ token }) => {
          this.busy.set(false);
          this.session.setOwner({ handle: this.handle(), token });
          this.authenticated.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(publishErrorMessage(err.error?.code));
        },
      });
  }

  /** Close when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
