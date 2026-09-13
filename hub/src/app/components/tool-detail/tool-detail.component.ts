import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FeatureCardComponent,
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
 * keeping all tool-specific markup out of this component. A host page can
 * also take over the "How it works" body by passing an empty `steps` array
 * and projecting `[how]` content (see `ToolDetailConfig.stepsMeta`).
 */
@Component({
  selector: 'dba-hub-tool-detail',
  standalone: true,
  imports: [
    RouterLink,
    StarryBackgroundComponent,
    FooterComponent,
    IconComponent,
    FeatureCardComponent,
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

  /** Feature count, zero-padded to two digits for the section meta. */
  protected readonly featureCount = computed(() =>
    String(this.config().features.length).padStart(2, '0'),
  );

  /** Step count, zero-padded to two digits for the section meta. */
  protected readonly stepCount = computed(() =>
    String(this.config().steps.length).padStart(2, '0'),
  );

  /** How-it-works meta label — `stepsMeta` override, or the computed count. */
  protected readonly stepsMetaLabel = computed(
    () => this.config().stepsMeta ?? `${this.stepCount()} STEPS`,
  );

  /** Fires the primary CTA analytics event. */
  onPrimary(): void {
    this.primaryClicked.emit();
  }

  /** Fires the secondary CTA analytics event. */
  onSecondary(): void {
    this.secondaryClicked.emit();
  }
}
