import { injectBaseURL } from '@analogjs/router/tokens';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { JourneyViewComponent } from '../components/journey-view/journey-view.component';
import { SAMPLE_HANDLE, SAMPLE_STORY } from '../models/sample-story.constants';
import { setCanonicalUrl } from '../utils/canonical.util';
import { formatHours } from '../utils/format.util';
import { resolveOrigin } from '../utils/origin.util';
import { applySocialMeta } from '../utils/social-meta.util';

/**
 * Demo journey at /demo — renders the bundled sample story ("Vera") in the
 * shared journey shell's Demo state. The story ships in the UI bundle, so there
 * is no network call and it is fully SSR-safe. Sets static OpenGraph meta from
 * the sample summary so a shared /demo link unfurls with a proper preview card.
 */
@Component({
  selector: 'dba-celestory-demo',
  standalone: true,
  imports: [JourneyViewComponent],
  templateUrl: './demo.page.html',
  styleUrl: './demo.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DemoPageComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  /** SSR base URL (origin), null in the browser — used to build absolute share URLs. */
  private readonly baseUrl = injectBaseURL();

  /** The bundled demo story, rendered entirely from the UI bundle. */
  protected readonly story = SAMPLE_STORY;
  /** The demo handle, shown in the hero (e.g. "@vera"). */
  protected readonly handle = SAMPLE_HANDLE;

  /** Applies the static demo OG meta (runs during SSR too). */
  ngOnInit(): void {
    this.applyMeta();
  }

  /** Sets the document title + full OG/Twitter unfurl tags + canonical from the
   * sample summary, so a shared /demo link previews well. Runs during SSR too. */
  private applyMeta(): void {
    const summary = SAMPLE_STORY.summary;
    const hours = formatHours(summary.totalIntegrationSeconds);
    const title = `Celestory — @${SAMPLE_HANDLE}'s journey (demo)`;
    const description = `${summary.targetCount} targets · ${hours}h integration · ${summary.nightCount} nights imaged.`;
    const origin = resolveOrigin(this.baseUrl);
    const url = origin ? `${origin}/demo` : null;
    this.title.setTitle(title);
    applySocialMeta(this.meta, {
      title,
      description,
      type: 'website',
      url: url ?? undefined,
      image: origin ? `${origin}/api/og/default` : undefined,
    });
    setCanonicalUrl(this.doc, url);
  }
}
