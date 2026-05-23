import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IconComponent,
  IconRailComponent,
  IconRailItemComponent,
  apertureIcon,
  downloadIcon,
  filterIcon,
  imageIcon,
  paletteIcon,
  targetIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { AnnotationFiltersPanelComponent } from '../../panels/annotation-filters/annotation-filters-panel.component';
import { AnnotationSelectedPanelComponent } from '../../panels/annotation-selected/annotation-selected-panel.component';
import { AnnotationStylePanelComponent } from '../../panels/annotation-style/annotation-style-panel.component';
import { CapturePanelComponent } from '../../panels/capture/capture-panel.component';
import { EquipmentPanelComponent } from '../../panels/equipment/equipment-panel.component';
import { ExportPanelComponent } from '../../panels/export/export-panel.component';
import { ObjectInfoPanelComponent } from '../../panels/object-info/object-info-panel.component';
import { StylePanelComponent } from '../../panels/style/style-panel.component';
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
    ObjectInfoPanelComponent,
    CapturePanelComponent,
    EquipmentPanelComponent,
    StylePanelComponent,
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
  readonly infographicSection = signal<InfographicSectionId>('object');
  /** Active inspector section for stellar mode. */
  readonly stellarSection = signal<StellarSectionId>('filters');

  /** Mode signal mirrored for templates. */
  readonly mode = computed(() => this.dataService.activeMode());

  /** Glyphs surfaced on the rail in infographic + stellar modes. */
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
    return id === 'object' || id === 'capture' || id === 'equipment' || id === 'style' || id === 'export';
  }

  private isStellarSection(id: string): id is StellarSectionId {
    return id === 'filters' || id === 'style' || id === 'selected';
  }
}
