import { RouteMeta } from '@analogjs/router';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
} from '@angular/core';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DemoFrameComponent } from '../../components/demo-frame/demo-frame.component';
import { ToolDetailComponent } from '../../components/tool-detail/tool-detail.component';
import { FILE_GROUPER_DETAIL } from './file-grouper-detail.constants';
import { FILE_GROUPER_REPO_URL } from './tool.constants';

/**
 * File Grouper tool page — premium redesign on the shared
 * `ToolDetailComponent`. Provides CLI terminal blocks via content projection
 * in place of demo media.
 */
@Component({
  selector: 'dba-hub-file-grouper-tool',
  standalone: true,
  imports: [ToolDetailComponent, DemoFrameComponent],
  templateUrl: './file-grouper.page.html',
  styleUrl: './file-grouper.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FileGrouperPageComponent {
  /** Content driving the shared detail layout. */
  protected readonly config = FILE_GROUPER_DETAIL;

  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterNextRender(() =>
      this.upsertCanonical('https://dbastrosuite.com/tool/file-grouper'),
    );
  }

  /** Fires the hub launch-tool analytics event. */
  onLaunch(): void {
    this.analytics.trackHubLaunchToolClicked('file-grouper', FILE_GROUPER_REPO_URL);
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
  title: 'File Grouper Tool - Dataset Organization Utility',
  meta: [
    {
      name: 'description',
      content:
        'A high-performance Go utility for automatically organizing astrophotography datasets by camera, date, and object.',
    },
    {
      property: 'og:title',
      content: 'File Grouper - Organize Your Space Data',
    },
    {
      property: 'og:description',
      content:
        'Automate the tedious task of sorting thousands of frames into a logical hierarchy for cleaner processing.',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/tool/file-grouper',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'File Grouper - Organize Your Space Data',
    },
    {
      name: 'twitter:description',
      content:
        'A high-performance Go utility for automatically organizing astrophotography datasets by camera, date, and object.',
    },
  ],
};
