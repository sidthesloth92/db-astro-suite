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
  /** Active inspector section for stellar mode. */
  readonly stellarSection = signal<StellarSectionId>('filters');

  /** Mode signal mirrored for templates. */
  readonly mode = computed(() => this.dataService.activeMode());

  /**
   * True once the user has added or clicked an annotation. Gates the
   * "Selected" rail item — it stays hidden on a fresh map and reappears
   * only when there's at least one annotation to inspect.
   */
  readonly hasAnnotations = computed(
    () => this.dataService.stellarMapData().annotations.length > 0,
  );

  /**
   * Auto-routes the inspector to the "Selected" panel whenever the user
   * picks (or adds) an annotation. Also bounces away when the last
   * annotation is removed so we never sit on an empty panel.
   */
  private readonly autoRouteSelected = effect(() => {
    const selectedId = this.dataService.selectedAnnotationId();
    const hasAny = this.hasAnnotations();
    if (selectedId) {
      this.stellarSection.set('selected');
    } else if (!hasAny && this.stellarSection() === 'selected') {
      this.stellarSection.set('filters');
    }
  });

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

  /** Picks a stellar section by id. */
  selectStellar(id: string): void {
    if (this.isStellarSection(id)) {
      this.stellarSection.set(id);
    }
  }

  private isInfographicSection(id: string): id is InfographicSectionId {
    return id === 'layout' || id === 'object' || id === 'capture' || id === 'equipment' || id === 'export';
  }

  private isStellarSection(id: string): id is StellarSectionId {
    return id === 'filters' || id === 'style' || id === 'selected' || id === 'export';
  }
}
