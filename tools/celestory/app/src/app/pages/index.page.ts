import { RouteMeta } from '@analogjs/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { CreateStoryResult } from '../models/api.model';
import type { CelestoryLedger } from '../models/ledger.model';
import { SAMPLE_LEDGER } from '../models/sample-ledger.constants';
import { PreviewStore } from '../services/preview-store.service';
import { StoryService } from '../services/story.service';

/** Landing flow states: file dropzone → choice → create form → created. */
type LandingMode = 'idle' | 'choice' | 'create' | 'created';

/**
 * Celestory landing + upload flow. Parses a dropped/chosen `celestory.json`
 * entirely client-side, then offers ① Visualise (hand off to /preview, nothing
 * uploaded) or ② Create (publish, get a URL + one-time key).
 */
@Component({
  selector: 'dba-celestory-landing',
  standalone: true,
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LandingPageComponent {
  private readonly storyService = inject(StoryService);
  private readonly previewStore = inject(PreviewStore);
  private readonly router = inject(Router);

  protected readonly mode = signal<LandingMode>('idle');
  protected readonly error = signal('');
  protected readonly fileName = signal('');
  protected readonly handle = signal('');
  protected readonly creating = signal(false);
  protected readonly created = signal<CreateStoryResult | null>(null);

  /** Parsed ledger held in memory (not rendered directly). */
  private ledger: CelestoryLedger | null = null;

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
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.readFile(file);
    }
  }

  /** Allows the page to act as a dropzone. */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
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
        this.error.set('That file isn’t a valid celestory.json export.');
        this.mode.set('idle');
      }
    };
    reader.onerror = () => this.error.set('Could not read that file.');
    reader.readAsText(file);
  }

  /** Loads the bundled sample ledger. */
  exploreSample(): void {
    this.error.set('');
    this.fileName.set('sample data');
    this.ledger = SAMPLE_LEDGER;
    this.mode.set('choice');
  }

  /** Tracks the handle input. */
  onHandleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handle.set(input.value);
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
          this.error.set('That file isn’t a valid celestory.json export.');
        } else {
          this.error.set('Something went wrong publishing. Please try again.');
        }
      },
    });
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
}

export const routeMeta: RouteMeta = {
  title: 'Celestory — your astrofolio, privately',
  meta: [
    {
      name: 'description',
      content:
        'Turn your astrophotography summary into a beautiful, shareable year-in-review. Your files never leave your machine — only the summary stats.',
    },
    { property: 'og:title', content: 'Celestory — your astrofolio, privately' },
    {
      property: 'og:description',
      content:
        'A privacy-first astrophotography year-in-review. Only your summary stats are uploaded — never your photos or raw files.',
    },
  ],
};
