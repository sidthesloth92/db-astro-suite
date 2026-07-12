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
import { CELESTORY_DETAIL } from './celestory-detail.constants';
import {
  CELESTORY_JSON_EXCERPT,
  CELESTORY_TERMINAL,
} from './celestory-output.constants';
import { CELESTORY_APP_URL } from './tool.constants';

/**
 * Celestory tool page on the shared `ToolDetailComponent`. Projects a
 * demo-walkthrough placeholder plus a terminal-transcript / celestory.json
 * output pair (real media to be dropped in once captured).
 */
@Component({
  selector: 'dba-hub-celestory-tool',
  standalone: true,
  imports: [ToolDetailComponent, DemoFrameComponent],
  templateUrl: './celestory.page.html',
  styleUrl: './celestory.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CelestoryPageComponent {
  /** Content driving the shared detail layout. */
  protected readonly config = CELESTORY_DETAIL;

  /** ASCII terminal transcript — a scan as it plays out on the CLI. */
  protected readonly terminal = CELESTORY_TERMINAL;

  /** Trimmed celestory.json excerpt — the file that scan produces. */
  protected readonly jsonExcerpt = CELESTORY_JSON_EXCERPT;

  /** Whether the OS-specific install dialog is open. */
  protected readonly isInstallOpen = signal(false);

  /** The visitor's detected OS, used to highlight their install command. */
  protected readonly detectedOs = signal<DetectedOs>('');

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.upsertCanonical('https://dbastrosuite.com/tool/celestory');
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('celestory', CELESTORY_APP_URL);
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
  title: 'Celestory - Chart Your Astrophotography Journey',
  meta: [
    {
      name: 'description',
      content:
        'Celestory scans your astrophotography FITS captures locally into a per-target integration timeline and equipment ledger, then charts your whole imaging journey in the browser. Publish a profile and join the leaderboards — only if you choose to.',
    },
    {
      property: 'og:title',
      content: 'Celestory - Chart Your Astrophotography Journey',
    },
    {
      property: 'og:description',
      content:
        'A local-first CLI + web app pair: scan your FITS library into one celestory.json, chart every target and night you have ever imaged, and share it on your terms.',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/tool/celestory',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'Celestory - Chart Your Astrophotography Journey',
    },
    {
      name: 'twitter:description',
      content:
        'Scan your FITS captures locally into a per-target integration timeline and equipment ledger — then chart and share your whole imaging journey.',
    },
  ],
};
