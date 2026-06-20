import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { JourneyViewComponent } from '../components/journey-view/journey-view.component';
import { SAMPLE_HANDLE, SAMPLE_STORY } from '../models/sample-story.constants';
import { formatHours } from '../utils/format.util';

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

  /** The bundled demo story, rendered entirely from the UI bundle. */
  protected readonly story = SAMPLE_STORY;
  /** The demo handle, shown in the hero (e.g. "@vera"). */
  protected readonly handle = SAMPLE_HANDLE;

  /** Applies the static demo OG meta (runs during SSR too). */
  ngOnInit(): void {
    this.applyMeta();
  }

  /** Sets the document title + OG/description tags from the sample summary. */
  private applyMeta(): void {
    const summary = SAMPLE_STORY.summary;
    const hours = formatHours(summary.totalIntegrationSeconds);
    const title = `${SAMPLE_HANDLE} · ${hours}h under the stars — Celestory`;
    const description = `${summary.objectCount} targets · ${hours}h integration · ${summary.nightCount} nights imaged.`;
    this.title.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
  }
}
