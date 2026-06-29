import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import type { DetectedOs } from './sortronomy.types';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DemoFrameComponent } from '../../components/demo-frame/demo-frame.component';
import { ToolDetailComponent } from '../../components/tool-detail/tool-detail.component';
import { SORTRONOMY_DETAIL } from './sortronomy-detail.constants';
import {
  SORTRONOMY_TREE_AFTER,
  SORTRONOMY_TREE_BEFORE,
} from './sortronomy-output.constants';
import { SORTRONOMY_REPO_URL } from './tool.constants';

/**
 * Sortronomy tool page — premium redesign on the shared `ToolDetailComponent`.
 * Projects a demo-walkthrough placeholder plus before/after folder-structure
 * placeholders (real media to be dropped in once captured).
 */
@Component({
  selector: 'dba-hub-sortronomy-tool',
  standalone: true,
  imports: [ToolDetailComponent, DemoFrameComponent],
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

  /** Whether the OS-specific install dialog is open. */
  protected readonly isInstallOpen = signal(false);

  /** The visitor's detected OS, used to highlight their install command. */
  protected readonly detectedOs = signal<DetectedOs>('');

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.upsertCanonical('https://dbastrosuite.com/tool/sortronomy');
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('sortronomy', SORTRONOMY_REPO_URL);
  }

  /** Handles an interactive step activation from the shared layout. */
  onStepAction(actionId: string): void {
    if (actionId === 'install') {
      this.detectedOs.set(this.detectOs());
      this.isInstallOpen.set(true);
      this.document.body.style.overflow = 'hidden';
    }
  }

  /** Closes the install dialog and restores body scroll. */
  closeInstall(): void {
    this.isInstallOpen.set(false);
    this.document.body.style.overflow = '';
  }

  /** Best-effort OS detection from the user agent (browser-only). */
  private detectOs(): DetectedOs {
    const ua = this.document.defaultView?.navigator.userAgent.toLowerCase() ?? '';
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux') || ua.includes('x11')) return 'linux';
    return '';
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
  title: 'Sortronomy - Organise Your FITS Captures Offline',
  meta: [
    {
      name: 'description',
      content:
        'Sortronomy is an offline command-line tool that organises astrophotography FITS files by camera, target, date, and filter — read straight from the headers. Nothing leaves your machine.',
    },
    {
      property: 'og:title',
      content: 'Sortronomy - Organize Your FITS Captures Offline',
    },
    {
      property: 'og:description',
      content:
        'A single-binary, fully offline wizard that sorts thousands of frames into a clean, calibration-ready hierarchy — straight from their FITS headers.',
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
        'An offline command-line tool that organises astrophotography FITS files by camera, target, date, and filter — read straight from the headers.',
    },
  ],
};
