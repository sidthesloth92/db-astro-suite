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
import { RouterLink } from '@angular/router';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { SessionStore } from '../../services/session-store.service';
import { StoryService } from '../../services/story.service';
import { publishErrorMessage } from '../../utils/publish-error.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { RecoveryCodePanelComponent } from '../recovery-code-panel/recovery-code-panel.component';
import { MIN_PASSWORD_LENGTH } from '../../models/password.constants';
import type { OwnerLoginMode } from '../../models/owner-login.types';

/**
 * Owner login for a published profile. Verifies the profile password against the
 * server, and on success records a per-tab management session (handle + token)
 * so the profile page reveals its Edit/Delete controls. Closes itself on success.
 * "Forgot password?" switches to recovery: the owner enters their recovery code
 * and a new password, is logged in, and is shown the replacement code once.
 */
@Component({
  selector: 'dba-owner-login-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, CelIconComponent, RecoveryCodePanelComponent, RouterLink],
  templateUrl: './owner-login-modal.component.html',
  styleUrl: './owner-login-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
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

  /** Which step the dialog shows: log in, recover with a code, or the new code after a reset. */
  protected readonly mode = signal<OwnerLoginMode>('login');
  /** Recovery-code field value. */
  protected readonly code = signal('');
  /** New-password field value (recovery). */
  protected readonly newPassword = signal('');
  /** The replacement recovery code returned by a successful reset. */
  protected readonly newRecoveryCode = signal('');
  /** Minimum new-password length, for the field hint. */
  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

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
          this.error.set(publishErrorMessage(err.error?.code, err.error?.details));
        },
      });
  }

  /** Switch to the recovery-code form. */
  showRecover(): void {
    this.mode.set('recover');
    this.error.set('');
  }

  /** Back from the recovery form to password login. */
  showLogin(): void {
    this.mode.set('login');
    this.error.set('');
  }

  /** Track the recovery-code input. */
  onCode(value: string): void {
    this.code.set(value);
    this.error.set('');
  }

  /** Track the new-password input. */
  onNewPassword(value: string): void {
    this.newPassword.set(value);
    this.error.set('');
  }

  /** Reset the password with the recovery code; on success log in and show the new code. */
  submitRecover(): void {
    const code = this.code().trim();
    const newPassword = this.newPassword();
    if (!code) {
      this.error.set('Enter your recovery code.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      this.error.set(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.storyService
      .recover(this.handle(), code, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ token, recoveryCode }) => {
          this.busy.set(false);
          this.session.setOwner({ handle: this.handle(), token });
          this.newRecoveryCode.set(recoveryCode);
          this.mode.set('recovered');
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(publishErrorMessage(err.error?.code, err.error?.details));
        },
      });
  }

  /** Leave the dialog. After a reset the owner is already logged in, so report that. */
  close(): void {
    if (this.mode() === 'recovered') {
      this.authenticated.emit();
      return;
    }
    this.closed.emit();
  }

  /** Close when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
