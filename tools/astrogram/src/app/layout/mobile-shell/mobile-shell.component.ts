import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  BottomNavComponent,
  FloatingSheetComponent,
  IconComponent,
  SegmentedTabsComponent,
  apertureIcon,
  cropIcon,
  filterIcon,
  imageIcon,
  paletteIcon,
  targetIcon,
  telescopeIcon,
} from '@db-astro-suite/ui';
import {
  MODE_TAB_OPTIONS,
  activeModeToTabId,
  tabIdToActiveMode,
} from '../../constants/mode-tabs.constants';
import type {
  MobileInfographicId,
  MobileNavItem,
  MobileStellarId,
} from '../inspector-section.types';
import { CaptionSectionComponent } from '../../components/caption-section/caption-section';
import { CardPreviewComponent } from '../../components/card-preview/card-preview';
import { StellarMapPreviewComponent } from '../../components/stellar-map-preview/stellar-map-preview';
import { AnnotationFiltersPanelComponent } from '../../panels/annotation-filters/annotation-filters-panel.component';
import { AnnotationSelectedPanelComponent } from '../../panels/annotation-selected/annotation-selected-panel.component';
import { AnnotationStylePanelComponent } from '../../panels/annotation-style/annotation-style-panel.component';
import { CapturePanelComponent } from '../../panels/capture/capture-panel.component';
import { EquipmentPanelComponent } from '../../panels/equipment/equipment-panel.component';
import { ObjectInfoPanelComponent } from '../../panels/object-info/object-info-panel.component';
import { LayoutPanelComponent } from '../../panels/layout/layout-panel.component';
import { CardDataService } from '../../services/card-data.service';
import { AstrogramTopBarComponent } from '../astrogram-top-bar/astrogram-top-bar.component';

/**
 * Mobile shell layout: compact top bar, full-bleed preview, and a
 * floating semi-transparent control sheet at the bottom. Tapping a
 * bottom-nav icon expands the sheet onto the relevant panel.
 */
@Component({
  selector: 'dba-ag-mobile-shell',
  standalone: true,
  imports: [
    AstrogramTopBarComponent,
    CardPreviewComponent,
    CaptionSectionComponent,
    StellarMapPreviewComponent,
    FloatingSheetComponent,
    BottomNavComponent,
    SegmentedTabsComponent,
    ObjectInfoPanelComponent,
    CapturePanelComponent,
    EquipmentPanelComponent,
    LayoutPanelComponent,
    AnnotationFiltersPanelComponent,
    AnnotationStylePanelComponent,
    AnnotationSelectedPanelComponent,
    IconComponent,
  ],
  templateUrl: './mobile-shell.component.html',
  styleUrls: ['./mobile-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileShellComponent {
  private readonly dataService = inject(CardDataService);

  /** Glyphs surfaced via the bottom-nav `navIcon` template switch. */
  protected readonly imageIcon = imageIcon;
  protected readonly apertureIcon = apertureIcon;
  protected readonly telescopeIcon = telescopeIcon;
  protected readonly cropIcon = cropIcon;
  protected readonly paletteIcon = paletteIcon;
  protected readonly filterIcon = filterIcon;
  protected readonly targetIcon = targetIcon;

  /** Active top-level mode mirrored from the shared signal. */
  readonly activeMode = computed(() => this.dataService.activeMode());

  /** Segmented-tab options for the Infographics / Stellar map toggle at the top. */
  readonly modeOptions = MODE_TAB_OPTIONS;

  /** Active mode mapped to the tab id consumed by `<dba-ui-segmented-tabs>`. */
  readonly selectedModeId = computed(() => activeModeToTabId(this.dataService.activeMode()));

  /** Forwards the top-bar mode-tab change into `CardDataService`. */
  onModeChange(id: string): void {
    this.dataService.activeMode.set(tabIdToActiveMode(id));
  }

  /** Active mobile section for infographic mode. */
  readonly infographicSection = signal<MobileInfographicId>('layout');
  /** Active mobile section for stellar mode. */
  readonly stellarSection = signal<MobileStellarId>('filters');

  /** Whether the floating sheet is currently expanded. */
  readonly sheetExpanded = signal<boolean>(false);

  /** Bottom-nav items for infographic mode. */
  readonly infographicItems: ReadonlyArray<MobileNavItem<MobileInfographicId>> = [
    { id: 'layout', label: 'Layout', iconName: 'crop' },
    { id: 'object', label: 'Info', iconName: 'image' },
    { id: 'capture', label: 'Capture', iconName: 'aperture' },
    { id: 'equipment', label: 'Gear', iconName: 'telescope' },
  ];

  /** Bottom-nav items for stellar mode. */
  readonly stellarItems: ReadonlyArray<MobileNavItem<MobileStellarId>> = [
    { id: 'filters', label: 'Filters', iconName: 'filter' },
    { id: 'style', label: 'Style', iconName: 'palette' },
    { id: 'selected', label: 'Item', iconName: 'target' },
  ];

  /** Title to render in the expanded sheet, derived from the active section. */
  readonly sheetTitle = computed(() => {
    if (this.activeMode() === 'infographic') {
      const map: Record<MobileInfographicId, string> = {
        object: 'Object info',
        capture: 'Capture',
        equipment: 'Equipment',
        layout: 'Layout',
      };
      return map[this.infographicSection()];
    }
    const map: Record<MobileStellarId, string> = {
      filters: 'Annotation filters',
      style: 'Annotation style',
      selected: 'Selected annotation',
    };
    return map[this.stellarSection()];
  });

  /** Handles a bottom-nav activation in infographic mode. */
  onInfographicActivate(id: string): void {
    if (!this.isInfographicId(id)) {
      return;
    }
    if (this.infographicSection() === id) {
      this.sheetExpanded.update((v) => !v);
    } else {
      this.infographicSection.set(id);
      this.sheetExpanded.set(true);
    }
  }

  /** Handles a bottom-nav activation in stellar mode. */
  onStellarActivate(id: string): void {
    if (!this.isStellarId(id)) {
      return;
    }
    if (this.stellarSection() === id) {
      this.sheetExpanded.update((v) => !v);
    } else {
      this.stellarSection.set(id);
      this.sheetExpanded.set(true);
    }
  }

  private isInfographicId(id: string): id is MobileInfographicId {
    return id === 'object' || id === 'capture' || id === 'equipment' || id === 'layout';
  }

  private isStellarId(id: string): id is MobileStellarId {
    return id === 'filters' || id === 'style' || id === 'selected';
  }
}
