import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FooterComponent,
  IconComponent,
  StarryBackgroundComponent,
  chevronLeftIcon,
  chevronRightIcon,
} from '@db-astro-suite/ui';
import { DualTitlePipe } from './dual-title.pipe';
import type { ToolDetailConfig } from './tool-detail.model';

/**
 * Shared, config-driven layout for every hub tool detail page. Renders a
 * uniform section order — hero (description + projected preview) → stats →
 * about → what it does → how it works → output → closing CTA — so the tool
 * pages can only differ in content, never in structure.
 *
 * The brand mark, the demo / live preview, and the output media are supplied
 * by the host page via content projection (`[mark]`, `[preview]`, `[output]`),
 * keeping all tool-specific markup out of this component.
 */
@Component({
  selector: 'dba-hub-tool-detail',
  standalone: true,
  imports: [
    RouterLink,
    StarryBackgroundComponent,
    FooterComponent,
    IconComponent,
    DualTitlePipe,
  ],
  templateUrl: './tool-detail.component.html',
  styleUrl: './tool-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolDetailComponent {
  /** Content configuration driving every section of the page. */
  readonly config = input.required<ToolDetailConfig>();

  /** Emitted when the user activates a primary "launch" CTA. */
  readonly primaryClicked = output<void>();
  /** Emitted when the user activates the secondary "GitHub" CTA. */
  readonly secondaryClicked = output<void>();

  /** Chevron-left glyph for the "RETURN TO HUB" back link. */
  protected readonly chevronLeftIcon = chevronLeftIcon;
  /** Chevron-right glyph for the CTA buttons. */
  protected readonly chevronRightIcon = chevronRightIcon;

  /** First half of the about paragraphs (left column). */
  protected readonly aboutLeft = computed(() => {
    const about = this.config().about;
    return about.slice(0, Math.ceil(about.length / 2));
  });

  /** Second half of the about paragraphs (right column). */
  protected readonly aboutRight = computed(() => {
    const about = this.config().about;
    return about.slice(Math.ceil(about.length / 2));
  });

  /** Fires the primary CTA analytics event. */
  onPrimary(): void {
    this.primaryClicked.emit();
  }

  /** Fires the secondary CTA analytics event. */
  onSecondary(): void {
    this.secondaryClicked.emit();
  }
}
