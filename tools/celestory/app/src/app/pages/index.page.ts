import { RouteMeta } from "@analogjs/router";
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
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { Router, RouterLink } from "@angular/router";
import { ConstellationFieldComponent } from "@db-astro-suite/ui";
import { catchError, of } from "rxjs";
import { CelestoryMarkComponent } from "../components/celestory-mark/celestory-mark.component";
import { CelestoryWordmarkComponent } from "../components/celestory-wordmark/celestory-wordmark.component";
import { UploadChoiceModalComponent } from "../components/upload-choice-modal/upload-choice-modal.component";
import type { CommunityStats } from "../models/community-stats.model";
import {
  GITHUB_URL,
  HUB_URL,
  INSTALL_COMMANDS,
  INSTALL_LABELS,
  SCAN_COMMAND,
} from "../models/landing.constants";
import type { InstallTool } from "../models/landing.types";
import { SUPPORTED_LEDGER_SCHEMA_VERSION } from "../models/ledger.constants";
import type { CelestoryLedger } from "../models/ledger.model";
import { SAMPLE_HANDLE } from "../models/sample-ledger.constants";
import { PreviewStore } from "../services/preview-store.service";
import { StoryService } from "../services/story.service";
import { copyToClipboard } from "../utils/clipboard.util";
import { formatCompact, formatCount } from "../utils/format.util";

/** Count-up animation duration, in milliseconds. */
const COUNT_UP_MS = 1600;

/**
 * Celestory landing + upload flow (value-first). Parses a dropped/chosen
 * `celestory.json` entirely client-side and routes straight to the Private
 * Preview visualization — no intermediate decision. The secondary CTA opens the
 * demo journey ("Vera"). Carries the DB Astro Suite theme — animated starfield,
 * neon-pink/cyan accents, and a three-step "Get started" walkthrough.
 */
@Component({
  selector: "dba-celestory-landing",
  standalone: true,
  imports: [
    RouterLink,
    ConstellationFieldComponent,
    CelestoryMarkComponent,
    CelestoryWordmarkComponent,
    UploadChoiceModalComponent,
  ],
  templateUrl: "./index.page.html",
  styleUrl: "./index.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LandingPageComponent {
  private readonly storyService = inject(StoryService);
  private readonly previewStore = inject(PreviewStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** User-facing error message, or empty when there is none. */
  protected readonly error = signal("");
  /** True between a successful parse and the navigation to the preview. */
  protected readonly processing = signal(false);
  /** True while a file is being dragged over the page. */
  protected readonly dragActive = signal(false);
  /** Which copy button last flashed "Copied". */
  protected readonly copied = signal("");
  /** Parsed ledger awaiting the visualise/create choice. */
  protected readonly pendingLedger = signal<CelestoryLedger | null>(null);
  /** Whether the post-upload "choose" modal is open. */
  protected readonly showChoose = signal(false);

  /** Selected CLI install channel in the "Get started" walkthrough. */
  protected readonly installTool = signal<InstallTool>("brew");
  /** Install command for the selected channel. */
  protected readonly installCommand = computed(
    () => INSTALL_COMMANDS[this.installTool()],
  );
  /** Tab label per install channel. */
  protected readonly installLabels = INSTALL_LABELS;
  /** Scan command shown beneath the install command. */
  protected readonly scanCommand = SCAN_COMMAND;
  /** DB Astro Suite hub URL the footer "Launch the app" links back to. */
  protected readonly hubUrl = HUB_URL;
  /** Public source repository, linked from the nav + footer GitHub icons. */
  protected readonly githubUrl = GITHUB_URL;
  /** Current year, shown in the footer copyright line. */
  protected readonly year = new Date().getFullYear();

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
  private readonly statusSection =
    viewChild<ElementRef<HTMLElement>>("statusSection");
  /** True once the browser confirms motion is allowed and IntersectionObserver exists. */
  private readonly canAnimate = signal(false);
  /** Guards the one-shot observe/animate setup. */
  private animationStarted = false;

  /** Animated "Journeys charted" counter (deduped upload attempts). */
  protected readonly journeys = computed(() => {
    const s = this.stats();
    return s ? formatCount(s.attemptCount * this.progress()) : "";
  });
  /** Animated "Hours integrated" counter. */
  protected readonly hours = computed(() => {
    const s = this.stats();
    return s
      ? formatCompact((s.totalIntegrationSeconds / 3600) * this.progress())
      : "";
  });
  /** Animated "Objects charted" counter. */
  protected readonly objects = computed(() => {
    const s = this.stats();
    return s ? formatCompact(s.objectCount * this.progress()) : "";
  });
  /** Animated "Light frames" counter. */
  protected readonly frames = computed(() => {
    const s = this.stats();
    return s ? formatCompact(s.lightFrameCount * this.progress()) : "";
  });

  /**
   * In the browser, decide how the count-up runs: with reduced-motion or no
   * IntersectionObserver, jump straight to the final values; otherwise arm the
   * scroll-into-view observer (wired up by the effect below).
   */
  private readonly countUpHook = afterNextRender(() => {
    const prefersReduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
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

  /** Opens the bundled demo journey ("Vera") — the aspirational sample. */
  exploreSample(): void {
    this.error.set("");
    void this.router.navigate(["/user", SAMPLE_HANDLE]);
  }

  /** Switches the displayed install channel. */
  selectInstall(tool: InstallTool): void {
    this.installTool.set(tool);
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
          this.copied.set("");
        }
      }, 1400);
    });
  }

  /** Shares the page via the Web Share API, falling back to copying the URL. */
  share(): void {
    if (typeof navigator === "undefined" || typeof location === "undefined") {
      return;
    }
    const payload = {
      title: "Celestory",
      text: "Chart your astrophotography journey under the stars.",
      url: location.href,
    };
    if (navigator.share) {
      // A user-cancelled share rejects; that is expected and safely ignored.
      void navigator.share(payload).catch(() => undefined);
    } else {
      void copyToClipboard(location.href);
    }
  }

  /**
   * Fire a deduped anonymous attempt ping for a CLI-produced ledger. Manual or
   * legacy ledgers (no identity) are skipped. Fire-and-forget — failures are
   * swallowed so they never block the upload flow.
   */
  private recordAttempt(ledger: CelestoryLedger): void {
    const installId = ledger.installId;
    const dataFingerprint = ledger.dataFingerprint;
    if (!installId || !dataFingerprint) {
      return;
    }
    this.storyService
      .recordAttempt({
        installId,
        dataFingerprint,
        totalIntegrationSeconds: ledger.summary.totalIntegrationSeconds,
        lightFrameCount: ledger.summary.lightFrameCount,
        objectCount: ledger.summary.objectCount,
      })
      .pipe(
        catchError(() => of(undefined)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Reads + parses a chosen/dropped file as a ledger, then (no decision) records
   * the attempt, stages it, and routes straight to the Private Preview view.
   */
  /** "Visualize & Share" — browser-only, no online profile. */
  chooseVisualize(): void {
    this.proceed(false);
  }
  /** "Create your Celestory" — opens the publish flow on the portfolio. */
  chooseCreate(): void {
    this.proceed(true);
  }
  /** Dismiss the choose modal without proceeding. */
  closeChoose(): void {
    this.showChoose.set(false);
    this.pendingLedger.set(null);
  }
  /** Stage the pending ledger and route to the Private Preview. */
  private proceed(autoPublish: boolean): void {
    const ledger = this.pendingLedger();
    if (!ledger) {
      return;
    }
    this.recordAttempt(ledger);
    this.previewStore.ledger.set(ledger);
    this.previewStore.fresh.set(true);
    this.previewStore.autoPublish.set(autoPublish);
    this.showChoose.set(false);
    void this.router.navigate(["/preview"]);
  }

  private readFile(file: File): void {
    this.error.set("");
    this.processing.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Parsed at the upload boundary, then shape-checked below.
        const parsed = JSON.parse(String(reader.result)) as CelestoryLedger;
        if (!parsed || typeof parsed !== "object" || !parsed.summary) {
          throw new Error("not a Celestory export");
        }
        // Reject ledgers from an older/newer CLI before rendering, so the user
        // gets a clear "update & regenerate" prompt instead of a broken view.
        if (parsed.schemaVersion != SUPPORTED_LEDGER_SCHEMA_VERSION) {
          this.processing.set(false);
          this.error.set(this.outdatedSchemaMessage(parsed));
          return;
        }
        // Hold the parsed ledger and let the user choose visualise vs create.
        this.pendingLedger.set(parsed);
        this.processing.set(false);
        this.showChoose.set(true);
      } catch {
        this.processing.set(false);
        this.error.set("That file isn’t a valid celestory.json export.");
      }
    };
    reader.onerror = () => {
      this.processing.set(false);
      this.error.set("Could not read that file.");
    };
    reader.readAsText(file);
  }

  /**
   * Build the message shown when a dropped ledger's schema version doesn't match
   * what this app renders — almost always an older CLI. Surfaces the producing
   * CLI version when present so the user knows what they ran.
   */
  private outdatedSchemaMessage(ledger: CelestoryLedger): string {
    const usedVersion = ledger.tool?.version
      ? ` (you used celestory ${ledger.tool.version})`
      : "";
    return (
      `This celestory.json was made by an older Celestory CLI${usedVersion}. ` +
      "Update to the latest version and re-scan your library to regenerate it."
    );
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
  title: "Celestory — Chart your journey under the stars",
  meta: [
    {
      name: "description",
      content:
        "Point Celestory at your astrophotography light frames and get a gallery-grade chronicle of your imaging journey — every target, every filter, every photon, across every year — rendered entirely in your browser. Nothing is uploaded.",
    },
    {
      property: "og:title",
      content: "Celestory — Chart your journey under the stars",
    },
    {
      property: "og:description",
      content:
        "A privacy-first astrophotography journey. Your light frames never leave your machine — everything renders in your browser.",
    },
  ],
};
