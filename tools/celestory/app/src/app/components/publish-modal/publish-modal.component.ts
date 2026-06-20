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
import type { CelestoryLedger } from '../../models/ledger.model';
import { SessionStore } from '../../services/session-store.service';
import { StoryService } from '../../services/story.service';
import { slugifyHandle } from '../../utils/handle.util';
import { publishErrorMessage } from '../../utils/publish-error.util';
import { publishShrinkWarning } from '../../utils/publish-shrink.util';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { copyToClipboard } from '../../utils/clipboard.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';

/**
 * Publish flow — claim (handle + password) → publishing → live (permanent URL) →
 * delete (type the handle to confirm). Creating sets a password; updating
 * verifies it and re-publishes the staged ledger. Create/update both return a
 * management session token recorded via `SessionStore`, so the publisher lands
 * in owner mode; delete is authorized by that token. Fully wired to the story API.
 */
@Component({
  selector: 'dba-publish-modal',
  standalone: true,
  imports: [TextButtonComponent, IconButtonComponent, CelIconComponent],
  templateUrl: './publish-modal.component.html',
  styleUrl: './publish-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class PublishModalComponent implements OnInit {
  private readonly storyService = inject(StoryService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly session = inject(SessionStore);

  /** The staged ledger to publish. */
  readonly ledger = input.required<CelestoryLedger>();
  /** The current handle (set when already published), prefilled in the form. */
  readonly currentHandle = input<string>('');
  /** Open straight to a phase ('delete'); '' starts the normal flow. */
  readonly initialPhase = input<'' | 'delete'>('');

  /** Emits the handle once published/updated, so the parent opens the profile. */
  readonly published = output<string>();
  /** Emits after a successful delete (returns to Private Preview). */
  readonly unpublished = output<void>();
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  /** Current phase. Opens straight on the single claim form (no create/update chooser). */
  protected readonly phase = signal<'claim' | 'publishing' | 'live' | 'delete'>(
    this.initialPhase() === 'delete' ? 'delete' : 'claim',
  );

  protected readonly handle = signal(this.currentHandle());
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** Set when an update would shrink the published totals; shown for confirmation. */
  protected readonly shrinkWarning = signal('');
  /** True once the user has accepted a shrink warning, so the update proceeds. */
  private shrinkConfirmed = false;
  protected readonly copied = signal(false);
  /** Password entered to confirm deletion in the delete phase. */
  protected readonly deletePassword = signal('');
  protected readonly deleteError = signal('');

  /** Cleaned handle for the URL preview. */
  protected readonly clean = computed(() => slugifyHandle(this.handle()));
  /**
   * The handle this device has already published (own profile), if any — from the
   * current route, the persisted session, or a profileId baked into the ledger.
   */
  private readonly knownHandle = computed(() =>
    slugifyHandle(
      this.currentHandle() || this.session.ownerHandle() || this.ledger().profileId || '',
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
   * required `ledger` input is only available once inputs are bound.
   */
  ngOnInit(): void {
    if (this.initialPhase() === 'delete') {
      // The `phase` field initialiser runs before inputs are bound, so it always
      // defaults to 'claim'. Now that inputs are available, switch to delete.
      this.phase.set('delete');
      return;
    }
    const known = this.knownHandle();
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
   * "already exists" reflects the server — not stale client ownership. A 404
   * (or any error) means free; a 200 means taken. Out-of-order responses are
   * ignored by re-checking the current handle before applying the result.
   */
  private checkAvailability(): void {
    if (this.availabilityTimer) {
      clearTimeout(this.availabilityTimer);
    }
    const handle = this.clean();
    this.serverExists.set(null);
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
          error: () => {
            if (this.clean() === handle) {
              this.serverExists.set(false);
            }
          },
        });
    }, 350);
  }
  /** Track the password input. */
  onPassword(value: string): void {
    this.password.set(value);
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
    if (!this.exists() && password.length < 6) {
      this.error.set('Choose a password of at least 6 characters.');
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

  /** Dismiss the shrink warning without publishing. */
  cancelShrink(): void {
    this.shrinkWarning.set('');
  }

  /**
   * Before an update, fetch the live profile's totals and warn if this ledger has
   * less integration/frames (likely a partial-library device). On any fetch error
   * (e.g. handle not found yet) we proceed — the update call surfaces the error.
   */
  private guardShrinkThenPublish(handle: string, password: string): void {
    this.busy.set(true);
    this.storyService
      .getStory(handle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (story) => {
          this.busy.set(false);
          const warn = publishShrinkWarning(this.ledger().summary, story.ledger.summary);
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
        ? this.storyService.updateStory(handle, this.ledger(), { password })
        : this.storyService.createStory(handle, password, this.ledger());
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        // Both create and update return a management session token: the
        // publisher lands directly in owner mode for this tab.
        this.session.setOwner({ handle, token: result.token });
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
          this.error.set(publishErrorMessage(code));
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
          this.deleteError.set(publishErrorMessage(err.error?.code));
        },
      });
  }

  /** Open the published profile — the user page plays the branded reveal on load. */
  openProfile(): void {
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
