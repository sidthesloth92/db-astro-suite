import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AnalyticsService,
  IconButtonComponent,
  IconComponent,
  SegmentedTabsComponent,
  checkIcon,
  copyIcon,
} from '@db-astro-suite/ui';
import { DemoFrameComponent } from '../../components/demo-frame/demo-frame.component';
import { ToolDetailComponent } from '../../components/tool-detail/tool-detail.component';
import { copyToClipboard } from '../../utils/clipboard.util';
import type { InstallOs } from '../../utils/detect-os.types';
import { detectOsFromUserAgent } from '../../utils/detect-os.util';
import { SORTRONOMY_DETAIL } from './sortronomy-detail.constants';
import {
  SORTRONOMY_TREE_AFTER,
  SORTRONOMY_TREE_BEFORE,
} from './sortronomy-output.constants';
import {
  COPY_FEEDBACK_MS,
  SORTRONOMY_INSTALL_COMMANDS,
  SORTRONOMY_OS_TABS,
  SORTRONOMY_RUN_COMMAND,
  SORTRONOMY_STEP_INSTALL_MOCK,
  SORTRONOMY_STEP_REVIEW_MOCK,
  SORTRONOMY_STEP_TREE_MOCK,
} from './sortronomy-steps.constants';
import { SORTRONOMY_RELEASES_URL, SORTRONOMY_REPO_URL } from './tool.constants';

/**
 * Sortronomy tool page — premium redesign on the shared `ToolDetailComponent`.
 * Projects the walkthrough demo video, an inline "How it works" section
 * (OS-tabbed install command, wizard run, resulting library — no dialogs),
 * and before/after folder-structure trees.
 */
@Component({
  selector: 'dba-hub-sortronomy-tool',
  standalone: true,
  imports: [
    ToolDetailComponent,
    DemoFrameComponent,
    SegmentedTabsComponent,
    IconButtonComponent,
    IconComponent,
  ],
  templateUrl: './sortronomy.page.html',
  styleUrl: './sortronomy.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SortronomyPageComponent {
  /** Content driving the shared detail layout. */
  protected readonly config = SORTRONOMY_DETAIL;

  /** ASCII "before" tree — the flat, unsorted capture dump. */
  protected readonly treeBefore = SORTRONOMY_TREE_BEFORE;

  /** ASCII "after" tree — the same frames classified into a clean hierarchy. */
  protected readonly treeAfter = SORTRONOMY_TREE_AFTER;

  /** OS choices for the install-command tabs. */
  protected readonly osTabs = SORTRONOMY_OS_TABS;

  /** The wizard-launch command shown in step 02. */
  protected readonly runCommand = SORTRONOMY_RUN_COMMAND;

  /** Releases page for manual binary downloads. */
  protected readonly releasesUrl = SORTRONOMY_RELEASES_URL;

  /** Step 01 visual — the install one-liner running to completion. */
  protected readonly stepInstallMock = SORTRONOMY_STEP_INSTALL_MOCK;

  /** Step 02 visual — the wizard's questions and review screen. */
  protected readonly stepReviewMock = SORTRONOMY_STEP_REVIEW_MOCK;

  /** Step 03 visual — a compact excerpt of the organised library. */
  protected readonly stepTreeMock = SORTRONOMY_STEP_TREE_MOCK;

  /** Copy glyph for the command copy buttons. */
  protected readonly copyIcon = copyIcon;

  /** Check glyph flashed while a copy button is in its "copied" state. */
  protected readonly checkIcon = checkIcon;

  /** OS whose install command is displayed. Defaults to macOS for SSR. */
  protected readonly selectedOs = signal<InstallOs>('mac');

  /** The install one-liner for the selected OS. */
  protected readonly installCommand = computed(
    () => SORTRONOMY_INSTALL_COMMANDS[this.selectedOs()],
  );

  /** Which copy button last flashed "Copied" (`''` when none). */
  protected readonly copied = signal('');

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.upsertCanonical('https://dbastrosuite.com/tool/sortronomy');
    afterNextRender(() => {
      const userAgent = this.document.defaultView?.navigator.userAgent ?? '';
      const os = detectOsFromUserAgent(userAgent);
      if (os) {
        this.selectedOs.set(os);
      }
    });
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('sortronomy', SORTRONOMY_REPO_URL);
  }

  /** Switches the displayed install command to the picked OS tab. */
  onOsChange(id: string): void {
    if (id === 'mac' || id === 'windows' || id === 'linux') {
      this.selectedOs.set(id);
    }
  }

  /** Copies a command and flashes the matching button's "copied" state. */
  copyCommand(key: string, text: string): void {
    void copyToClipboard(text).then((ok) => {
      if (!ok) {
        return;
      }
      this.copied.set(key);
      setTimeout(() => {
        if (this.copied() === key) {
          this.copied.set('');
        }
      }, COPY_FEEDBACK_MS);
    });
  }

  /** Ensures a `<link rel="canonical">` exists pointing at the supplied URL. */
  private upsertCanonical(href: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}

export const routeMeta: RouteMeta = {
  title: 'Sortronomy - Organize Your FITS Captures Offline',
  meta: [
    {
      name: 'description',
      content:
        'Sortronomy is a free, offline command-line wizard that turns a night’s messy astrophotography capture folder into a clean, processing-ready library — sorted by camera, target, date, and filter, straight from the FITS headers.',
    },
    {
      property: 'og:title',
      content: 'Sortronomy - Organize Your FITS Captures Offline',
    },
    {
      property: 'og:description',
      content:
        'A single-binary, fully offline wizard that copies thousands of raw frames into a clean, calibration-ready library — straight from their FITS headers. Originals are never touched.',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/tool/sortronomy',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'Sortronomy - Organize Your FITS Captures Offline',
    },
    {
      name: 'twitter:description',
      content:
        'A free, offline command-line wizard that organizes astrophotography FITS files by camera, target, date, and filter — read straight from the headers.',
    },
  ],
};
