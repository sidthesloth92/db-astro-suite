import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  CommentIconComponent,
  EditIconComponent,
  InspectorFieldComponent,
  InspectorSectionComponent,
  MapPinIconComponent,
  MicroInputComponent,
  SearchIconComponent,
  TagIconComponent,
} from '@db-astro-suite/ui';
import { CardData } from '../../models/card-data';
import { AstroInfoService } from '../../services/astro-info.service';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel for object identification, capture context, and the
 * on-card description / long-form story. Replaces the legacy
 * `ImageDetailsComponent`. All edits flow through `CardDataService`.
 */
@Component({
  selector: 'dba-ag-object-info-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    InspectorFieldComponent,
    MicroInputComponent,
    TagIconComponent,
    MapPinIconComponent,
    CommentIconComponent,
    EditIconComponent,
    SearchIconComponent,
  ],
  templateUrl: './object-info-panel.component.html',
  styleUrls: ['./object-info-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectInfoPanelComponent {
  private readonly dataService = inject(CardDataService);
  private readonly astroInfo = inject(AstroInfoService);

  /** Current card document — read-only for the template. */
  readonly cardData = this.dataService.cardData;

  /** True while a Wiki fetch is in flight. */
  readonly isFetching = signal(false);

  /** Hashtags input ignores leading `#` so the user can edit naked tokens. */
  readonly hashtagsValue = computed(() => {
    const raw = this.cardData().hashtags ?? '';
    return raw.replace(/(^|\s)#/g, '$1').trim();
  });

  /** Author input strips a leading `@` so the prefix decorator can show it. */
  readonly authorValue = computed(() => this.cardData().author.replace(/^@/, ''));

  /** Patches a single field on the card document. */
  update<K extends keyof CardData>(field: K, value: CardData[K]): void {
    this.dataService.updateData({ [field]: value } as Partial<CardData>);
  }

  /** Handles changes to the author handle (re-prepending the `@`). */
  onAuthorChange(value: string): void {
    const trimmed = value.replace(/^@+/, '').trim();
    this.update('author', trimmed ? `@${trimmed}` : '');
  }

  /** Handles changes to the hashtags input (re-prepending `#` per token). */
  onHashtagsChange(value: string): void {
    const tokens = value
      .split(/\s+/)
      .map((t) => t.replace(/^#+/, '').trim())
      .filter((t) => t.length > 0)
      .map((t) => `#${t}`);
    this.update('hashtags', tokens.join(' '));
  }

  /** Handles changes from the on-image caption textarea. */
  onDescriptionChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.update('description', target.value);
  }

  /** Handles changes from the long-form caption textarea. */
  onCaptionChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.update('caption', target.value);
  }

  /**
   * Looks up the current object title on Wikipedia and appends the
   * extract to the long-form caption. Best-effort: failures are
   * swallowed and surfaced only via the spinner clearing.
   */
  async fetchWiki(): Promise<void> {
    if (this.isFetching()) {
      return;
    }
    const query = this.cardData().title.trim();
    if (!query) {
      return;
    }
    this.isFetching.set(true);
    try {
      const info = await this.astroInfo.getObjectDescription(query);
      if (info) {
        const current = this.cardData().caption ?? '';
        const separator = current ? '\n\n' : '';
        this.update('caption', current + separator + info.extract);
      }
    } finally {
      this.isFetching.set(false);
    }
  }
}
