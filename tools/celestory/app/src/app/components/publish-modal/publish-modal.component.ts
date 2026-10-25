import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import type { CreateStoryResult, UpdateStoryResult } from '../../models/api.model';
import { appHost, profileDisplayUrl, profileUrl } from '../../models/app.constants';
import type { CelestoryStory } from '../../models/story.model';
import { SessionStore } from '../../services/session-store.service';
import { StoryService } from '../../services/story.service';
import { slugifyHandle } from '../../utils/handle.util';
import { publishErrorMessage } from '../../utils/publish-error.util';
import { publishShrinkWarning } from '../../utils/publish-shrink.util';
import { MIN_PASSWORD_LENGTH } from '../../models/password.constants';
import { publishName } from '../../utils/display-identity.util';
import { observerName, observerWithName } from '../../utils/observer-name.util';
import { MAX_DISPLAY_NAME_LENGTH } from '../../models/observer.constants';
import { canSaveProfile as profileIsSaveable, displayNameError } from '../../utils/profile-form.util';
import { loadFailure } from '../../utils/load-failure.util';
import type { PublishPhaseRequest } from '../../models/publish-phase.types';
import type { ProfileChanges } from '../../models/api.model';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { copyToClipboard } from '../../utils/clipboard.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { RecoveryCodePanelComponent } from '../recovery-code-panel/recovery-code-panel.component';

/**
 * Publish flow — claim (handle + password) → publishing → live (permanent URL) →
 * delete (type the handle to confirm). Creating sets a password; updating
 * verifies it and re-publishes the staged story. Create/update both return a
 * management session token recorded via `SessionStore`, so the publisher lands
 * in owner mode; delete is authorized by that token. Fully wired to the story API.
 */
@Component({
  selector: 'dba-publish-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, CelIconComponent, RecoveryCodePanelComponent],
  templateUrl: './publish-modal.component.html',
  styleUrl: './publish-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class PublishModalComponent implements OnInit {
  private readonly storyService = inject(StoryService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly session = inject(SessionStore);

  /** The staged story to publish. */
  readonly story = input.required<CelestoryStory>();
  /** The current handle (set when already published), prefilled in the form. */
  readonly currentHandle = input<string>('');
  /** Open straight to an owner screen ('delete' | 'edit' | 'password'); '' starts the publish flow. */
  readonly initialPhase = input<PublishPhaseRequest>('');

  /** Emits the handle once published/updated, so the parent opens the profile. */
  readonly published = output<string>();
  /** Emits after a successful delete (returns to Private Preview). */
  readonly unpublished = output<void>();
  /** Emits the (possibly new) handle after "Edit profile" saves, so the parent refreshes or navigates. */
  readonly profileEdited = output<string>();
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  /** Current phase. Opens straight on the single claim form (no create/update chooser). */
  protected readonly phase = signal<'claim' | 'publishing' | 'live' | 'delete' | 'edit' | 'password'>(
    'claim',
  );
  /** Which success screen 'live' shows: a fresh publish, or an edited profile's new link. */
  protected readonly liveVariant = signal<'published' | 'edited'>('published');

  protected readonly handle = signal(this.currentHandle());
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Set when an update would shrink the published totals; shown for confirmation. */
  protected readonly shrinkWarning = signal('');
  /** True once the user has accepted a shrink warning, so the update proceeds. */
  private shrinkConfirmed = false;
  protected readonly copied = signal(false);
  /** The new profile's one-time recovery code, shown once on the live screen ('' for updates). */
  protected readonly recoveryCode = signal('');
  /** Display name field (publish and edit screens). */
  protected readonly displayName = signal('');
  /** The profile's saved name when "Edit profile" opened (to detect a change). */
  private readonly editInitialName = signal('');
  /** Longest display name accepted (matches the server). */
  protected readonly maxNameLength = MAX_DISPLAY_NAME_LENGTH;
  /** Minimum new-password length, for the field hint. */
  protected readonly MIN_PASSWORD = MIN_PASSWORD_LENGTH;
  /** Change-password fields and outcome. */
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly passwordChanged = signal(false);
  /** Password entered to confirm deletion in the delete phase. */
  protected readonly deletePassword = signal('');
  protected readonly deleteError = signal('');

  /** Cleaned handle for the URL preview. */
  protected readonly clean = computed(() => slugifyHandle(this.handle()));
  /** The story as sent: carries the Display name field (keeping any "— place") when set. */
  private readonly storyToPublish = computed<CelestoryStory>(() => {
    const story = this.story();
    const name = this.displayName().trim();
    return name ? { ...story, observer: observerWithName(story.observer, name) } : story;
  });
  /** Problem with the Display name field, or ''. */
  protected readonly nameError = computed(() =>
    displayNameError(this.displayName(), this.phase() === 'edit' && !!this.editInitialName()),
  );
  /** Edit profile: the typed handle differs from the profile's current one. */
  protected readonly handleChanged = computed(() => this.clean() !== this.targetHandle());
  /** Edit profile: the new handle already belongs to another profile. */
  protected readonly handleTaken = computed(() => this.handleChanged() && this.exists());
  /** Edit profile: something changed, is valid, and a changed handle is confirmed free. */
  protected readonly canSaveProfile = computed(() =>
    profileIsSaveable({
      name: this.displayName(),
      initialName: this.editInitialName(),
      handle: this.clean(),
      currentHandle: this.targetHandle(),
      handleExists: this.serverExists(),
      busy: this.busy(),
    }),
  );
  /**
   * The handle this device has already published (own profile), if any — from the
   * current route, the persisted session, or a profileId baked into the story.
   */
  private readonly knownHandle = computed(() =>
    slugifyHandle(
      this.currentHandle() || this.session.ownerHandle() || this.story().profileId || '',
    ),
  );
  /** A handle the server reported as already taken — lets the owner reclaim it with its password. */
  private readonly takenHandle = signal('');
  /**
   * Live server availability of the typed handle: true = a profile is published
   * under it, false = free, null = unknown/checking. This is the source of truth
   * for "already exists" — never stale client state — so a handle that was wiped
   * or deleted shows as free again.
   */
  private readonly serverExists = signal<boolean | null>(null);
  /** Set when the availability check couldn't reach the server (shown under the handle). */
  protected readonly availabilityError = signal('');
  /** Debounce handle for the availability check. */
  private availabilityTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * True when the typed handle actually has a published profile on the server
   * (live check) — or one the server just reported as taken on submit (race).
   * Publishing then replaces that profile's data, so the form switches to update
   * mode (warning + password). Stale client ownership never makes this true.
   */
  protected readonly exists = computed(() => {
    const c = this.clean();
    return !!c && (this.serverExists() === true || c === this.takenHandle());
  });
  /** Derived intent: updating an existing profile vs creating a new one. */
  protected readonly intent = computed<'create' | 'update'>(() =>
    this.exists() ? 'update' : 'create',
  );
  /** Host the published profile lives on — the current app origin (shown as the handle prefix). */
  protected readonly host = appHost();
  /** Full canonical profile URL for the typed handle (used for copy/share). */
  protected readonly profileLink = computed(() => profileUrl(this.clean()));
  /** Display form of the profile URL shown in the modal (scheme stripped). */
  protected readonly urlPreview = computed(() => profileDisplayUrl(this.clean() || 'username'));
  /** Normalized handle being deleted (from the published profile). */
  protected readonly targetHandle = computed(() => slugifyHandle(this.currentHandle()));
  /** True once a confirmation password has been entered. */
  protected readonly canDelete = computed(() => !!this.targetHandle() && !!this.deletePassword());

  /**
   * Detect a returning user so the single claim form republishes instead of
   * creating: a configured profileId (or this device's published handle) means
   * "continue your journey". Read here (not in field initialisers) because the
   * required `story` input is only available once inputs are bound.
   */
  ngOnInit(): void {
    // The `phase` field initialiser runs before inputs are bound, so it always
    // defaults to 'claim'. Now that inputs are available, open the right screen.
    const requested = this.initialPhase();
    if (requested === 'delete' || requested === 'password') {
      this.phase.set(requested);
      return;
    }
    if (requested === 'edit') {
      const saved = observerName(this.story().observer);
      this.displayName.set(saved);
      this.editInitialName.set(saved);
      this.handle.set(this.targetHandle());
      this.phase.set('edit');
      return;
    }
    this.displayName.set(publishName(this.story(), this.session.identity()));
    // Prefill: a handle this device already owns, else the username edited in preview.
    const known = this.knownHandle() || slugifyHandle(this.session.identity().username);
    if (known) {
      this.handle.set(known);
    }
    // Verify the (possibly pre-filled) handle against the server so a stale
    // local "owner" handle whose profile no longer exists shows as free.
    this.checkAvailability();
  }

  /** Track the handle input. */
  onHandle(value: string): void {
    this.handle.set(value);
    // A different handle clears the prior "taken" recovery state.
    this.takenHandle.set('');
    this.checkAvailability();
  }

  /**
   * Debounced live check of whether the typed handle is already published, so
   * "already exists" reflects the server — not stale client ownership. A 200
   * means taken and only a 404 means free; any other failure leaves it unknown
   * and says so, so an outage can't make a taken handle look available.
   * Out-of-order responses are ignored by re-checking the current handle.
   */
  private checkAvailability(): void {
    if (this.availabilityTimer) {
      clearTimeout(this.availabilityTimer);
    }
    const handle = this.clean();
    this.serverExists.set(null);
    this.availabilityError.set('');
    if (!handle) {
      return;
    }
    this.availabilityTimer = setTimeout(() => {
      this.storyService
        .getStory(handle)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (this.clean() === handle) {
              this.serverExists.set(true);
            }
          },
          error: (error: unknown) => {
            if (this.clean() !== handle) {
              return;
            }
            if (loadFailure(error) === 'not-found') {
              this.serverExists.set(false);
            } else {
              this.availabilityError.set('Couldn’t check that handle. Try again in a moment.');
            }
          },
        });
    }, 350);
  }
  /** Track the password input. */
  onPassword(value: string): void {
    this.password.set(value);
  }
  /** Track the Display name input. */
  onDisplayName(value: string): void {
    this.displayName.set(value);
    this.error.set('');
  }
  /** Track the change-password inputs. */
  onCurrentPassword(value: string): void {
    this.currentPassword.set(value);
    this.error.set('');
  }
  onNewPassword(value: string): void {
    this.newPassword.set(value);
    this.error.set('');
  }

  /**
   * Edit profile: save the changed name and/or handle with the owner session.
   * A handle change shows the "updated" link screen (the old URL is released);
   * a name-only change closes and lets the parent re-fetch the profile.
   */
  saveProfile(): void {
    if (!this.canSaveProfile()) {
      return;
    }
    const token = this.session.token();
    if (!token) {
      this.error.set(publishErrorMessage('SESSION_INVALID'));
      return;
    }
    const name = this.displayName().trim();
    const changes: ProfileChanges = {
      ...(name && name !== this.editInitialName() ? { name } : {}),
      ...(this.handleChanged() ? { newHandle: this.clean() } : {}),
    };
    const fromHandle = this.targetHandle();
    this.busy.set(true);
    this.error.set('');
    this.storyService
      .updateProfile(fromHandle, changes, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.session.setOwner({ handle: result.handle, token: result.token });
          if (result.handle === fromHandle) {
            this.profileEdited.emit(result.handle);
            return;
          }
          this.handle.set(result.handle);
          this.liveVariant.set('edited');
          this.phase.set('live');
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(publishErrorMessage(err.error?.code, err.error?.details));
        },
      });
  }

  /** Change password: confirm the current one, set the new one, keep the owner logged in. */
  changePassword(): void {
    const current = this.currentPassword();
    const next = this.newPassword();
    if (!current) {
      this.error.set('Enter your current password.');
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      this.error.set(`Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    const token = this.session.token();
    if (!token) {
      this.error.set(publishErrorMessage('SESSION_INVALID'));
      return;
    }
    const handle = this.targetHandle();
    this.busy.set(true);
    this.error.set('');
    this.storyService
      .changePassword(handle, current, next, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.session.setOwner({ handle, token: result.token });
          this.passwordChanged.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(publishErrorMessage(err.error?.code, err.error?.details));
        },
      });
  }

  /** Submit the claim/update form. Updates first check for an accidental shrink. */
  submit(): void {
    const handle = this.clean();
    const password = this.password();
    if (!handle) {
      this.error.set('Choose a handle first.');
      return;
    }
    if (!password) {
      this.error.set(
        this.exists()
          ? 'Enter the profile password to update it.'
          : 'Set a password to protect your profile.',
      );
      return;
    }
    if (!this.exists() && password.length < MIN_PASSWORD_LENGTH) {
      this.error.set(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    this.error.set('');

    if (this.intent() === 'update' && !this.shrinkConfirmed) {
      this.guardShrinkThenPublish(handle, password);
      return;
    }
    this.publish(handle, password);
  }

  /** Accept the shrink warning and republish anyway (replaces the live profile). */
  publishAnyway(): void {
    this.shrinkConfirmed = true;
    this.shrinkWarning.set('');
    this.publish(this.clean(), this.password());
  }

  /**
   * Before an update, fetch the live profile's totals and warn if this story has
   * less integration/frames (likely a partial-library device). On any fetch error
   * (e.g. handle not found yet) we proceed — the update call surfaces the error.
   */
  private guardShrinkThenPublish(handle: string, password: string): void {
    this.busy.set(true);
    this.storyService
      .getStory(handle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.busy.set(false);
          const warn = publishShrinkWarning(this.story().summary, profile.story.summary);
          if (warn) {
            this.shrinkWarning.set(warn);
            return;
          }
          this.publish(handle, password);
        },
        error: () => {
          this.busy.set(false);
          this.publish(handle, password);
        },
      });
  }

  /**
   * Send the create/update request and move to the live phase on success. Shows
   * the branded publishing animation (orbiting rocket + progress) while in
   * flight, with a short floor so the reveal doesn't flash by on a fast network.
   */
  private publish(handle: string, password: string, forceMode?: 'create' | 'update'): void {
    this.busy.set(true);
    this.phase.set('publishing');
    const startedAt = Date.now();
    const mode = forceMode ?? this.intent();
    const request$: Observable<CreateStoryResult | UpdateStoryResult> =
      mode === 'update'
        ? this.storyService.updateStory(handle, this.storyToPublish(), { password })
        : this.storyService.createStory(handle, password, this.storyToPublish());
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        // Both create and update return a management session token: the
        // publisher lands directly in owner mode for this tab.
        this.session.setOwner({ handle, token: result.token });
        // Only a create issues a recovery code; an update keeps the existing one.
        this.recoveryCode.set('recoveryCode' in result ? result.recoveryCode : '');
        const wait = Math.max(0, 1600 - (Date.now() - startedAt));
        setTimeout(() => {
          this.busy.set(false);
          this.phase.set('live');
        }, wait);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        const code = err.error?.code;
        if (code === 'HANDLE_TAKEN' && mode === 'create') {
          // A create collided with an existing handle: switch to update mode so
          // the owner can reclaim it by entering its password (also recovers a
          // handle orphaned by an earlier partial publish).
          this.takenHandle.set(this.clean());
          this.error.set('');
          this.phase.set('claim');
        } else if (code === 'STORY_NOT_FOUND' && mode === 'update') {
          // We meant to update a handle this device had published, but the
          // profile no longer exists (deleted by the owner, or reset
          // server-side). The handle is free — drop the stale ownership hint and
          // claim it fresh instead of dead-ending on "no profile found".
          this.takenHandle.set('');
          this.session.clearOwner();
          this.error.set('');
          this.publish(handle, password, 'create');
        } else {
          this.error.set(publishErrorMessage(code, err.error?.details));
          this.phase.set('claim');
        }
      },
    });
  }

  /** Confirm deletion with the profile password (the owner session token also authorizes). */
  confirmDelete(): void {
    if (!this.canDelete()) {
      return;
    }
    const handle = this.targetHandle();
    const token = this.session.token() ?? undefined;
    const password = this.deletePassword();
    this.busy.set(true);
    this.storyService
      .deleteStory(handle, { token, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.session.clearOwner();
          this.unpublished.emit();
          this.closed.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.deleteError.set(publishErrorMessage(err.error?.code, err.error?.details));
        },
      });
  }

  /** Open the published (or just re-addressed) profile — the user page plays the branded reveal on load. */
  openProfile(): void {
    if (this.liveVariant() === 'edited') {
      this.profileEdited.emit(this.clean());
      return;
    }
    this.published.emit(this.clean());
  }

  /** Copy the live URL. */
  copyLink(): void {
    void copyToClipboard(this.profileLink()).then((ok) => {
      if (ok) {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1400);
      }
    });
  }

  /** Track the delete-confirmation password input. */
  onDeletePassword(value: string): void {
    this.deletePassword.set(value);
    this.deleteError.set('');
  }

  /** Close when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
