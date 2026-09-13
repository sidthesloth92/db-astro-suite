import type { IconDefinition } from '@db-astro-suite/ui';

/** Readiness state of a tool, driving the status-pill tone + label. */
export type ToolDetailStatus = 'ready' | 'wip';

/** A single headline metric rendered in the stats strip. */
export interface ToolDetailStat {
  /** Large value, e.g. `'~20s'`, `'4K'`. */
  readonly value: string;
  /** Small uppercase label beneath the value, e.g. `'Card → Post'`. */
  readonly label: string;
}

/** A single capability rendered in the "What it does" feature grid. */
export interface ToolDetailFeature {
  /** Line icon glyph for the framed icon tile. */
  readonly icon: IconDefinition;
  /** Capability name (rendered uppercase). */
  readonly name: string;
  /** One- to two-line description of the capability. */
  readonly body: string;
}

/** A single numbered step in the "How it works" strip. */
export interface ToolDetailStep {
  /** Short step title (rendered uppercase). */
  readonly title: string;
  /** One-line explanation of the step. */
  readonly body: string;
}

/**
 * Three-part CTA headline so the highlighted segment can be coloured
 * without binding raw HTML (e.g. "Build your next post in under "
 * + "30 seconds" + ".").
 */
export interface ToolDetailCtaTitle {
  /** Text before the accent-coloured highlight. */
  readonly before: string;
  /** Accent-coloured highlight segment. */
  readonly accent: string;
  /** Text after the highlight. */
  readonly after: string;
}

/**
 * Full content configuration for a tool detail page. Drives the shared
 * `ToolDetailComponent` layout so every tool page stays structurally
 * identical and can only differ in content. Visual slots (the hero mark,
 * the live/demo preview, and the output media) are supplied via content
 * projection rather than this config.
 */
export interface ToolDetailConfig {
  /** Full tool name, used as the hero title's accessible label, e.g. `'ASTROGRAM'`. */
  readonly name: string;
  /** Leading, pink/glowing segment of the hero title, e.g. `'ASTRO'`. */
  readonly titleAccent: string;
  /** Trailing, white segment of the hero title, e.g. `'GRAM'`. */
  readonly titleRest: string;
  /** Short uppercase tagline beneath the hero title. */
  readonly tagline: string;
  /** Top-nav mission label, e.g. `'Tool · Astrogram'`. */
  readonly missionLabel: string;
  /** Tool index label shown in the hero status row, e.g. `'Tool 02'`. */
  readonly moduleLabel: string;
  /** Readiness state — chooses the status-pill tone. */
  readonly status: ToolDetailStatus;
  /** Status pill text, e.g. `'Ready'` / `'In Progress'`. */
  readonly statusLabel: string;
  /** Hero lead paragraph. */
  readonly description: string;

  /** Primary CTA label, e.g. `'Launch Astrogram'`. */
  readonly primaryLabel: string;
  /** Primary CTA href. */
  readonly primaryUrl: string;
  /** When true, the primary CTA opens in a new tab (external link). */
  readonly primaryExternal: boolean;
  /** Optional secondary (ghost) CTA label, e.g. `'View on GitHub'`. */
  readonly secondaryLabel?: string;
  /** Optional secondary (ghost) CTA href. */
  readonly secondaryUrl?: string;

  /** Kicker above the hero preview slot, e.g. `'Demo'`. */
  readonly previewKicker: string;
  /** Optional small meta beside the preview kicker, e.g. `'02:14'`. */
  readonly previewMeta?: string;

  /** Headline metrics for the stats strip (4 recommended). */
  readonly stats: readonly ToolDetailStat[];

  /** Kicker for the About / Overview section. */
  readonly aboutKicker: string;
  /** Title for the About / Overview section. */
  readonly aboutTitle: string;
  /** Optional small meta beside the About title. */
  readonly aboutMeta?: string;
  /** About paragraphs — split across two columns automatically. */
  readonly about: readonly string[];
  /** Optional pull-quote rendered with an accent rule. */
  readonly aboutPull?: string;

  /** Capabilities for the "What it does" grid. */
  readonly features: readonly ToolDetailFeature[];
  /**
   * Steps for the "How it works" strip. Leave empty to render the host
   * page's projected `[how]` content in place of the default step list.
   */
  readonly steps: readonly ToolDetailStep[];
  /**
   * Optional meta label beside the "How it works" title; falls back to the
   * computed `'NN STEPS'`. Set it when `steps` is empty and the section body
   * is supplied via the `[how]` projection slot.
   */
  readonly stepsMeta?: string;

  /** Kicker for the Output section. */
  readonly outputKicker: string;
  /** Optional title for the Output section. Omit to let projected per-item headers stand alone. */
  readonly outputTitle?: string;
  /** Optional small meta beside the Output title. */
  readonly outputMeta?: string;
  /** Optional caption beneath the projected output media. */
  readonly outputCaption?: string;

  /** Three-part headline for the closing CTA card. */
  readonly ctaTitle: ToolDetailCtaTitle;
  /** Sub-label beneath the CTA headline. */
  readonly ctaSubtitle: string;
}
