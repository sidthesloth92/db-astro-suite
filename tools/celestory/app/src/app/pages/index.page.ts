import { RouteMeta } from "@analogjs/router";
import { injectBaseURL } from "@analogjs/router/tokens";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  type OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { Meta } from "@angular/platform-browser";
import { DOCUMENT } from "@angular/common";
import { setCanonicalUrl } from "../utils/canonical.util";
import { setStructuredData } from "../utils/structured-data.util";
import { websiteJsonLd } from "../utils/json-ld.util";
import { resolveOrigin } from "../utils/origin.util";
import { applySocialMeta } from "../utils/social-meta.util";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { Router, RouterLink } from "@angular/router";
import {
  ConstellationFieldComponent,
  FeatureCardComponent,
  IconButtonComponent,
  TextButtonComponent,
} from "@db-astro-suite/ui";
import { catchError, of } from "rxjs";
import { CelestoryMarkComponent } from "../components/celestory-mark/celestory-mark.component";
import { CelestoryWordmarkComponent } from "../components/celestory-wordmark/celestory-wordmark.component";
import { UploadChoiceModalComponent } from "../components/upload-choice-modal/upload-choice-modal.component";
import { PublishModalComponent } from "../components/publish-modal/publish-modal.component";
import type { CommunityStats } from "../models/community-stats.model";
import {
  ABOUT_URL,
  ASTROGRAM_URL,
  GITHUB_URL,
  HUB_URL,
  INSTAGRAM_URL,
  INSTALL_COMMANDS,
  INSTALL_LABELS,
  INSTALL_TOOLS,
  RELEASES_URL,
  SCAN_COMMAND,
  STARWIZZ_URL,
} from "../models/landing.constants";
import type { InstallTool } from "../models/landing.types";
import type { CelestoryStory } from "../models/story.model";
import { PreviewStore } from "../services/preview-store.service";
import { StoryService } from "../services/story.service";
import { copyToClipboard } from "../utils/clipboard.util";
import { formatCompact, formatCount } from "../utils/format.util";
import { readStoryFile } from "../utils/read-story.util";

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
    FeatureCardComponent,
    TextButtonComponent,
    IconButtonComponent,
    CelestoryMarkComponent,
    CelestoryWordmarkComponent,
    UploadChoiceModalComponent,
    PublishModalComponent,
  ],
  templateUrl: "./index.page.html",
  styleUrl: "./index.page.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LandingPageComponent implements OnInit {
  private readonly storyService = inject(StoryService);
  private readonly previewStore = inject(PreviewStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  /** SSR base URL (origin), null in the browser — used to build the absolute og:image URL. */
  private readonly baseUrl = injectBaseURL();

  /** User-facing error message, or empty when there is none. */
  protected readonly error = signal("");
  /** True between a successful parse and the navigation to the preview. */
  protected readonly processing = signal(false);
  /** True while a file is being dragged over the page. */
  protected readonly dragActive = signal(false);
  /** Which copy button last flashed "Copied". */
  protected readonly copied = signal("");
  /** Parsed story awaiting the visualise/create choice. */
  protected readonly pendingStory = signal<CelestoryStory | null>(null);
  /** Whether the post-upload "choose" modal is open. */
  protected readonly showChoose = signal(false);
  /** Whether the publish (claim handle) modal is open directly on the landing. */
  protected readonly showPublish = signal(false);

  /** Selected CLI install channel in the "Get started" walkthrough. */
  protected readonly installTool = signal<InstallTool>("brew");
  /** Install command for the selected channel. */
  protected readonly installCommand = computed(
    () => INSTALL_COMMANDS[this.installTool()],
  );
  /** Tab label per install channel. */
  protected readonly installLabels = INSTALL_LABELS;
  /** Install-channel tabs in display order. */
  protected readonly installTools = INSTALL_TOOLS;
  /** GitHub Releases link for Linux / manual binary downloads. */
  protected readonly releasesUrl = RELEASES_URL;
  /** Scan command shown beneath the install command. */
  protected readonly scanCommand = SCAN_COMMAND;
  /** DB Astro Suite hub URL the footer "All tools" link points back to. */
  protected readonly hubUrl = HUB_URL;
  /** Public source repository, linked from the nav + footer GitHub icons. */
  protected readonly githubUrl = GITHUB_URL;
  /** Astrogram tool page, linked from the footer "DB Astro Suite" column. */
  protected readonly astrogramUrl = ASTROGRAM_URL;
  /** Starwizz tool page, linked from the footer "DB Astro Suite" column. */
  protected readonly starwizzUrl = STARWIZZ_URL;
  /** Author's personal site, linked from the footer "Connect" column. */
  protected readonly aboutUrl = ABOUT_URL;
  /** DB Astro Suite Instagram, linked from the footer "Connect" column. */
  protected readonly instagramUrl = INSTAGRAM_URL;
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

  /** Animated "Celestories charted" counter — every resolved upload, auth + unauth. */
  protected readonly charted = computed(() =>
    formatCount((this.stats()?.chartedCount ?? 0) * this.progress()),
  );
  /** Animated "Live Celestories" counter — online, published profiles. */
  protected readonly live = computed(() =>
    formatCount((this.stats()?.liveCount ?? 0) * this.progress()),
  );
  /** Animated "Hours integrated" counter. */
  protected readonly hours = computed(() =>
    formatCompact(
      ((this.stats()?.totalIntegrationSeconds ?? 0) / 3600) * this.progress(),
    ),
  );
  /** Animated "Targets charted" counter. */
  protected readonly targets = computed(() =>
    formatCompact((this.stats()?.targetCount ?? 0) * this.progress()),
  );
  /** Animated "Light frames" counter. */
  protected readonly frames = computed(() =>
    formatCompact((this.stats()?.lightFrameCount ?? 0) * this.progress()),
  );

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

  /** Set the full social unfurl tags (with an absolute og:image) — SSR-rendered
   * for crawlers; routeMeta keeps the static title/description baseline. */
  ngOnInit(): void {
    const title = "Celestory — Chart your journey under the stars";
    const description =
      "A privacy-first astrophotography journey. Your light frames never leave your machine — everything renders in your browser.";
    const origin = resolveOrigin(this.baseUrl);
    applySocialMeta(this.meta, {
      title,
      description,
      type: "website",
      url: origin || undefined,
      image: origin ? `${origin}/api/og/default` : undefined,
    });
    setCanonicalUrl(this.doc, origin || null);
    setStructuredData(this.doc, websiteJsonLd(origin));
  }

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
    // Clear the value so re-selecting the SAME file fires `change` again —
    // otherwise re-picking the same file after closing the choose modal (or any
    // earlier pick) is a silent no-op because the input value is unchanged.
    input.value = "";
    if (file) {
      void this.readFile(file);
    }
  }

  /** Handles a file dropped anywhere on the page. */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.readFile(file);
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

  /** Opens the bundled demo journey ("Vera") at /demo — the aspirational sample. */
  exploreSample(): void {
    this.error.set("");
    void this.router.navigate(["/demo"]);
  }

  /** Smooth-scrolls to the "Get started" steps section (replaces the #how anchor). */
  scrollToHow(): void {
    if (typeof document === "undefined") {
      return;
    }
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
  }

  /** Opens an external URL in a new tab (GitHub link). */
  openExternal(url: string): void {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener");
    }
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
   * Fire an anonymous attempt ping for a CLI-produced story — the server log is
   * append-only, so every visualise counts toward the community totals. Manual
   * or legacy storys (no identity) are skipped. Fire-and-forget — failures are
   * swallowed so they never block the upload flow.
   */
  private recordAttempt(story: CelestoryStory): void {
    const installId = story.installId;
    const dataFingerprint = story.dataFingerprint;
    if (!installId || !dataFingerprint) {
      return;
    }
    this.storyService
      .recordAttempt({
        installId,
        dataFingerprint,
        totalIntegrationSeconds: story.summary.totalIntegrationSeconds,
        lightFrameCount: story.summary.lightFrameCount,
        targetCount: story.summary.targetCount,
      })
      .pipe(
        catchError(() => of(undefined)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Reads + parses a chosen/dropped file as a story, then (no decision) records
   * the attempt, stages it, and routes straight to the Private Preview view.
   */
  /** "Visualize & Share" — browser-only, no online profile. */
  chooseVisualize(): void {
    this.proceed(false);
  }
  /**
   * "Create your Celestory" — open the claim-handle dialog instantly, right on
   * the landing (no navigation/journey render first). The publish modal owns the
   * claim → launch animation → live → open-profile sequence from here.
   */
  chooseCreate(): void {
    const story = this.pendingStory();
    if (!story) {
      return;
    }
    this.recordAttempt(story);
    this.showChoose.set(false);
    this.showPublish.set(true);
  }
  /**
   * After a successful publish, open the new live profile. The modal is left
   * mounted (covering the landing) until the route swap completes, so the landing
   * never flashes while the lazy profile route loads; the profile page then plays
   * the branded reveal as its loading screen.
   */
  onPublished(handle: string): void {
    void this.router.navigate(["/user", handle]);
  }
  /** Close the publish modal, discarding the staged story. */
  closePublish(): void {
    this.showPublish.set(false);
    this.pendingStory.set(null);
  }
  /** Dismiss the choose modal without proceeding. */
  closeChoose(): void {
    this.showChoose.set(false);
    this.pendingStory.set(null);
  }
  /** Stage the pending story and route to the Private Preview. */
  private proceed(autoPublish: boolean): void {
    const story = this.pendingStory();
    if (!story) {
      return;
    }
    this.recordAttempt(story);
    this.previewStore.story.set(story);
    this.previewStore.fresh.set(true);
    this.previewStore.autoPublish.set(autoPublish);
    this.showChoose.set(false);
    void this.router.navigate(["/preview"]);
  }

  private async readFile(file: File): Promise<void> {
    this.error.set("");
    this.processing.set(true);
    const result = await readStoryFile(file);
    this.processing.set(false);
    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    // Hold the parsed story and let the user choose visualise vs create.
    this.pendingStory.set(result.story);
    this.showChoose.set(true);
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
  // Baseline description; the full OG/Twitter unfurl set (with an absolute
  // og:image) is applied in the component's ngOnInit so it can use the request
  // origin. See applySocialMeta.
  meta: [
    {
      name: "description",
      content:
        "Point Celestory at your astrophotography light frames and get a gallery-grade chronicle of your imaging journey — every target, every filter, every photon, across every year — rendered entirely in your browser. Nothing is uploaded.",
    },
  ],
};
