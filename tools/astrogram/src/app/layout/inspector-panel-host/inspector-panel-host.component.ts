import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import {
  IconComponent,
  IconRailComponent,
  IconRailItemComponent,
  apertureIcon,
  cropIcon,
  downloadIcon,
  filterIcon,
  imageIcon,
  paletteIcon,
  targetIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { LayoutPanelComponent } from '../../panels/layout/layout-panel.component';
import { AnnotationFiltersPanelComponent } from '../../panels/annotation-filters/annotation-filters-panel.component';
import { AnnotationSelectedPanelComponent } from '../../panels/annotation-selected/annotation-selected-panel.component';
import { AnnotationStylePanelComponent } from '../../panels/annotation-style/annotation-style-panel.component';
import { CapturePanelComponent } from '../../panels/capture/capture-panel.component';
import { EquipmentPanelComponent } from '../../panels/equipment/equipment-panel.component';
import { ExportPanelComponent } from '../../panels/export/export-panel.component';
import { ObjectInfoPanelComponent } from '../../panels/object-info/object-info-panel.component';
import type {
  InfographicSectionId,
  StellarSectionId,
} from '../inspector-section.types';

// Re-export so existing importers (other shells, specs) continue to work.
export type { InfographicSectionId, StellarSectionId };

/**
 * Right-side inspector host. Renders the icon rail derived from the
 * current mode (`infographic` / `stellar-map`) and the panel content
 * corresponding to the active section. Owns its own `activeSection`
 * signal — section choice is ephemeral UI state, not shared with other
 * components.
 */
@Component({
  selector: 'dba-ag-inspector-panel-host',
  standalone: true,
  imports: [
    IconComponent,
    IconRailComponent,
    IconRailItemComponent,
    LayoutPanelComponent,
    ObjectInfoPanelComponent,
    CapturePanelComponent,
    EquipmentPanelComponent,
    ExportPanelComponent,
    AnnotationFiltersPanelComponent,
    AnnotationStylePanelComponent,
    AnnotationSelectedPanelComponent,
  ],
  templateUrl: './inspector-panel-host.component.html',
  styleUrls: ['./inspector-panel-host.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectorPanelHostComponent {
  private readonly dataService = inject(CardDataService);

  /** Active inspector section for infographic mode. */
  readonly infographicSection = signal<InfographicSectionId>('layout');
  /** The stellar section the user explicitly picked from the rail. Derived `stellarSection` may override (forced to `'selected'` when an annotation is selected). */
  private readonly _userStellarSection = signal<StellarSectionId>('filters');
  /**
   * Derived stellar section.
   * - If an annotation is selected → `'selected'` (overrides the user's pick).
   * - Else if the user's last pick was `'selected'` → fall back to `'filters'` (the section is no longer valid).
   * - Else → the user's pick.
   * Synchronous derivation eliminates the race window inherent to effect-based bouncing.
   */
  readonly stellarSection = computed<StellarSectionId>(() => {
    const user = this._userStellarSection();
    // Cleanup-only fallback: if the user was on "Selected Target" but
    // the selection that justified it has cleared, drop back to Filters
    // so the @switch doesn't render the empty-state panel orphaned.
    if (user === 'selected' && this.dataService.selectedAnnotationId() === null) {
      return 'filters';
    }
    return user;
  });

  /** Mode signal mirrored for templates. */
  readonly mode = computed(() => this.dataService.activeMode());

  /**
   * Gates the "Selected Target" rail item — visible only while an
   * annotation is currently selected. Adding an annotation implicitly
   * selects it, so the item appears on add and disappears on deselect.
   */
  readonly hasSelectedAnnotation = computed(
    () => this.dataService.selectedAnnotationId() !== null,
  );

  /**
   * Rail highlight id. When an annotation is selected, the "Selected
   * Target" item lights up to indicate where the user can go to inspect
   * it — independent of which panel is actually showing (driven by
   * `stellarSection`). Without a selection, falls back to the active
   * section so the rail highlight tracks the visible panel.
   */
  readonly activeStellarRailId = computed<StellarSectionId>(() =>
    this.hasSelectedAnnotation() ? 'selected' : this.stellarSection(),
  );

  /** Scrollable panel containers — one per mode branch in the template. */
  private readonly panelScrollEls = viewChildren<ElementRef<HTMLElement>>('panelScroll');

  /**
   * Resets the panel's scroll position whenever the user switches mode
   * or active section. Without this, the new panel renders mid-scroll
   * because the `.panel` container persists across section swaps.
   */
  private readonly resetPanelScroll = effect(() => {
    // Subscribe to mode + both section signals so any switch triggers a reset.
    void this.mode();
    void this.infographicSection();
    void this.stellarSection();
    for (const ref of this.panelScrollEls()) {
      ref.nativeElement.scrollTop = 0;
    }
  });

  /** Glyphs surfaced on the rail in infographic + stellar modes. */
  protected readonly cropIcon = cropIcon;
  protected readonly imageIcon = imageIcon;
  protected readonly apertureIcon = apertureIcon;
  protected readonly telescopeIcon = telescopeIcon;
  protected readonly paletteIcon = paletteIcon;
  protected readonly downloadIcon = downloadIcon;
  protected readonly filterIcon = filterIcon;
  protected readonly targetIcon = targetIcon;

  /** Picks an infographic section by id. */
  selectInfographic(id: string): void {
    if (this.isInfographicSection(id)) {
      this.infographicSection.set(id);
    }
  }

  /** Picks a stellar section by id. Navigation is independent of selection. */
  selectStellar(id: string): void {
    if (this.isStellarSection(id)) {
      this._userStellarSection.set(id);
    }
  }

  private isInfographicSection(id: string): id is InfographicSectionId {
    return id === 'layout' || id === 'object' || id === 'capture' || id === 'equipment' || id === 'export';
  }

  private isStellarSection(id: string): id is StellarSectionId {
    return id === 'filters' || id === 'style' || id === 'selected' || id === 'export';
  }
}
