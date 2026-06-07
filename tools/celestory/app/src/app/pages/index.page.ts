import { RouteMeta } from '@analogjs/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AnimatedStarryBackgroundComponent } from '@db-astro-suite/ui';
import { catchError, of } from 'rxjs';
import type { CreateStoryResult } from '../models/api.model';
import type { CommunityStats } from '../models/community-stats.model';
import {
  HUB_URL,
  INSTALL_COMMANDS,
  INSTALL_LABELS,
  SCAN_COMMAND,
} from '../models/landing.constants';
import type { InstallTool, LandingMode } from '../models/landing.types';
import type { CelestoryLedger } from '../models/ledger.model';
import { SAMPLE_LEDGER } from '../models/sample-ledger.constants';
import { PreviewStore } from '../services/preview-store.service';
import { StoryService } from '../services/story.service';
import { copyToClipboard } from '../utils/clipboard.util';
import { formatCompact, formatCount } from '../utils/format.util';

/** Count-up animation duration, in milliseconds. */
const COUNT_UP_MS = 1600;

/**
 * Celestory landing + upload flow. Parses a dropped/chosen `ledger.json`
 * entirely client-side, then offers ① Visualise (hand off to /preview, nothing
 * uploaded) or ② Create (publish, get a URL + one-time key). Carries the
 * DB Astro Suite theme — animated starfield, neon-pink/cyan accents, and a
 * three-step "Get started" walkthrough.
 */
@Component({
  selector: 'dba-celestory-landing',
  standalone: true,
  imports: [AnimatedStarryBackgroundComponent],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscapeKey()' },
})
export default class LandingPageComponent {
  private readonly storyService = inject(StoryService);
  private readonly previewStore = inject(PreviewStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Current step of the upload flow; drives the post-upload modal. */
  protected readonly mode = signal<LandingMode>('idle');
  /** User-facing error message, or empty when there is none. */
  protected readonly error = signal('');
  /** Name of the loaded ledger file (or "sample data"). */
  protected readonly fileName = signal('');
  /** The chosen public handle for ② Create. */
  protected readonly handle = signal('');
  /** Whether a publish request is in flight. */
  protected readonly creating = signal(false);
  /** The created story (URL + one-time key), once published. */
  protected readonly created = signal<CreateStoryResult | null>(null);
  /** True while a file is being dragged over the page. */
  protected readonly dragActive = signal(false);
  /** Which copy button last flashed "Copied". */
  protected readonly copied = signal('');

  /** Selected CLI install channel in the "Get started" walkthrough. */
  protected readonly installTool = signal<InstallTool>('brew');
  /** Install command for the selected channel. */
  protected readonly installCommand = computed(() => INSTALL_COMMANDS[this.installTool()]);
  /** Tab label per install channel. */
  protected readonly installLabels = INSTALL_LABELS;
  /** Scan command shown beneath the install command. */
  protected readonly scanCommand = SCAN_COMMAND;
  /** DB Astro Suite hub URL the nav links back to. */
  protected readonly hubUrl = HUB_URL;

  /** Live community aggregates for the counters; null until loaded / on error. */
  protected readonly stats = toSignal(
    this.storyService
      .getCommunityStats()
      .pipe(catchError(() => of<CommunityStats | null>(null))),
    { initialValue: null },
  );

  /** Count-up progress 0→1; starts at 0 so the figures roll up when scrolled into view. */
  private readonly progress = signal(0);

  /** The status section, observed so the count-up fires only when it scrolls in. */
  private readonly statusSection = viewChild<ElementRef<HTMLElement>>('statusSection');
  /** True once the browser confirms motion is allowed and IntersectionObserver exists. */
  private readonly canAnimate = signal(false);
  /** Guards the one-shot observe/animate setup. */
  private animationStarted = false;

  /** Animated "Astrophotographers" counter. */
  protected readonly photographers = computed(() => {
    const s = this.stats();
    return s ? formatCount(s.storyCount * this.progress()) : '';
  });
  /** Animated "Hours integrated" counter. */
  protected readonly hours = computed(() => {
    const s = this.stats();
    return s ? formatCompact((s.totalIntegrationSeconds / 3600) * this.progress()) : '';
  });
  /** Animated "Objects charted" counter. */
  protected readonly objects = computed(() => {
    const s = this.stats();
    return s ? formatCompact(s.objectCount * this.progress()) : '';
  });
  /** Animated "Light frames" counter. */
  protected readonly frames = computed(() => {
    const s = this.stats();
    return s ? formatCompact(s.lightFrameCount * this.progress()) : '';
  });

  /** Parsed ledger held in memory (not rendered directly). */
  private ledger: CelestoryLedger | null = null;

  /**
   * In the browser, decide how the count-up runs: with reduced-motion or no
   * IntersectionObserver, jump straight to the final values; otherwise arm the
   * scroll-into-view observer (wired up by the effect below).
   */
  private readonly countUpHook = afterNextRender(() => {
    const prefersReduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      this.progress.set(1);
      return;
    }
    this.canAnimate.set(true);
  });

  /**
   * Once the counters exist and animation is armed, observe the section and run
   * the count-up the first time it scrolls into view (it sits below the fold).
   */
  private readonly observeCounters = effect(() => {
    const section = this.statusSection();
    if (this.animationStarted || !this.canAnimate() || !section) {
      return;
    }
    this.animationStarted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          this.runCountUp();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(section.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  });

  /** Handles the hidden file input change. */
  onFileInput(event: Event): void {
    // event.target is the file input element at this DOM boundary.
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.readFile(file);
    }
  }

  /** Handles a file dropped anywhere on the page. */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.readFile(file);
    }
  }

  /** Highlights the dropzone while a file is dragged over the page. */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  /** Clears the drag highlight when the pointer leaves the page. */
  onDragLeave(): void {
    this.dragActive.set(false);
  }

  /**
   * Loads the bundled sample ledger and jumps straight to the client-side
   * preview — the choice modal is reserved for real uploads only.
   */
  exploreSample(): void {
    this.error.set('');
    this.previewStore.ledger.set(SAMPLE_LEDGER);
    void this.router.navigate(['/preview']);
  }

  /** Tracks the handle input. */
  onHandleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handle.set(input.value);
  }

  /** Switches the displayed install channel. */
  selectInstall(tool: InstallTool): void {
    this.installTool.set(tool);
  }

  /** ① Visualise — stage the ledger and route to the client-side preview. */
  chooseVisualise(): void {
    if (!this.ledger) {
      return;
    }
    this.previewStore.ledger.set(this.ledger);
    void this.router.navigate(['/preview']);
  }

  /** Shows the handle form for ② Create. */
  startCreate(): void {
    this.error.set('');
    this.mode.set('create');
  }

  /** Returns from the create form back to the two options. */
  backToChoice(): void {
    this.error.set('');
    this.mode.set('choice');
  }

  /** ② Create — publish the ledger under the chosen handle. */
  submitCreate(): void {
    const handle = this.handle().trim().toLowerCase();
    if (!this.ledger || !handle) {
      return;
    }
    this.creating.set(true);
    this.error.set('');
    this.storyService.createStory(handle, this.ledger).subscribe({
      next: (result) => {
        this.creating.set(false);
        this.created.set(result);
        this.mode.set('created');
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        const code: unknown = err.error?.data?.code;
        if (code === 'HANDLE_TAKEN') {
          this.error.set('That handle is taken — try another.');
        } else if (code === 'INVALID_HANDLE') {
          this.error.set('Handles are 3–30 chars: lowercase letters, numbers and hyphens.');
        } else if (code === 'INVALID_LEDGER') {
          this.error.set('That file isn’t a valid ledger.json export.');
        } else {
          this.error.set('Something went wrong publishing. Please try again.');
        }
      },
    });
  }

  /** Copies text and flashes a "Copied" state for the given key. */
  copy(key: string, text: string): void {
    void copyToClipboard(text).then((ok) => {
      if (!ok) {
        return;
      }
      this.copied.set(key);
      setTimeout(() => {
        if (this.copied() === key) {
          this.copied.set('');
        }
      }, 1400);
    });
  }

  /** Shares the page via the Web Share API, falling back to copying the URL. */
  share(): void {
    if (typeof navigator === 'undefined' || typeof location === 'undefined') {
      return;
    }
    const payload = {
      title: 'Celestory',
      text: 'Chart your astrophotography journey under the stars.',
      url: location.href,
    };
    if (navigator.share) {
      // A user-cancelled share rejects; that is expected and safely ignored.
      void navigator.share(payload).catch(() => undefined);
    } else {
      void copyToClipboard(location.href);
    }
  }

  /** Closes the post-upload modal when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /** Closes the modal on Escape. */
  onEscapeKey(): void {
    if (this.mode() !== 'idle') {
      this.closeModal();
    }
  }

  /** Closes the modal and returns to the dropzone. */
  closeModal(): void {
    this.reset();
  }

  /** Resets back to the dropzone. */
  reset(): void {
    this.ledger = null;
    this.created.set(null);
    this.handle.set('');
    this.fileName.set('');
    this.error.set('');
    this.mode.set('idle');
  }

  /** Reads + parses a chosen/dropped file as a ledger, or surfaces an error. */
  private readFile(file: File): void {
    this.error.set('');
    this.fileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Parsed at the upload boundary, then shape-checked below.
        const parsed = JSON.parse(String(reader.result)) as CelestoryLedger;
        if (!parsed || typeof parsed !== 'object' || !parsed.summary) {
          throw new Error('not a Celestory export');
        }
        this.ledger = parsed;
        this.mode.set('choice');
      } catch {
        this.error.set('That file isn’t a valid ledger.json export.');
        this.mode.set('idle');
      }
    };
    reader.onerror = () => this.error.set('Could not read that file.');
    reader.readAsText(file);
  }

  /** Eases the counters from 0→target over COUNT_UP_MS. */
  private runCountUp(): void {
    const startedAt = performance.now();
    const tick = (now: number): void => {
      const linear = Math.min(1, (now - startedAt) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - linear, 3); // easeOutCubic
      this.progress.set(eased);
      if (linear < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
}

export const routeMeta: RouteMeta = {
  title: 'Celestory — Chart your journey under the stars',
  meta: [
    {
      name: 'description',
      content:
        'Point Celestory at your astrophotography light frames and get a gallery-grade chronicle of your imaging journey — every target, every filter, every photon, across every year — rendered entirely in your browser. Nothing is uploaded.',
    },
    { property: 'og:title', content: 'Celestory — Chart your journey under the stars' },
    {
      property: 'og:description',
      content:
        'A privacy-first astrophotography journey. Your light frames never leave your machine — everything renders in your browser.',
    },
  ],
};
