import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  BottomNavComponent,
  FloatingSheetComponent,
  IconComponent,
  SegmentedTabsComponent,
  apertureIcon,
  cropIcon,
  downloadIcon,
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
import { ExportPanelComponent } from '../../panels/export/export-panel.component';
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
    ExportPanelComponent,
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
  protected readonly downloadIcon = downloadIcon;

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
  /** The stellar section the user explicitly picked from the bottom-nav. Derived `stellarSection` may override (forced to `'selected'` when an annotation is selected). */
  private readonly _userStellarSection = signal<MobileStellarId>('filters');
  /**
   * Derived stellar section.
   * - If an annotation is selected → `'selected'` (overrides the user's pick).
   * - Else if the user's last pick was `'selected'` → fall back to `'filters'`.
   * - Else → the user's pick.
   * Synchronous derivation eliminates the race window inherent to effect-based bouncing.
   */
  readonly stellarSection = computed<MobileStellarId>(() => {
    const user = this._userStellarSection();
    // Cleanup-only fallback: if the user was on "Selected Target" but
    // the selection that justified it has cleared, drop back to Filters
    // so the @switch doesn't render the empty-state panel orphaned.
    if (user === 'selected' && this.dataService.selectedAnnotationId() === null) {
      return 'filters';
    }
    return user;
  });

  /** Whether the floating sheet is currently expanded. */
  readonly sheetExpanded = signal<boolean>(false);

  /** Bottom-nav items for infographic mode. */
  readonly infographicItems: ReadonlyArray<MobileNavItem<MobileInfographicId>> = [
    { id: 'layout', label: 'Layout', iconName: 'crop' },
    { id: 'object', label: 'Info', iconName: 'image' },
    { id: 'capture', label: 'Capture', iconName: 'aperture' },
    { id: 'equipment', label: 'Gear', iconName: 'telescope' },
    { id: 'export', label: 'Export', iconName: 'download' },
  ];

  /**
   * Gates the "Selected Target" bottom-nav item — visible only while an
   * annotation is currently selected. Mirrors desktop-rail behaviour.
   */
  readonly hasSelectedAnnotation = computed(
    () => this.dataService.selectedAnnotationId() !== null,
  );

  /**
   * Bottom-nav highlight id. When an annotation is selected, the
   * "Selected Target" item lights up to indicate where the user can go
   * to inspect it — independent of which panel is actually showing in
   * the sheet (driven by `stellarSection`). Without a selection, falls
   * back to the active section.
   */
  readonly activeStellarRailId = computed<MobileStellarId>(() =>
    this.hasSelectedAnnotation() ? 'selected' : this.stellarSection(),
  );

  /**
   * Bottom-nav items for stellar mode. "Selected Target" is appended
   * only while an annotation is selected, mirroring the desktop rail.
   */
  readonly stellarItems = computed<ReadonlyArray<MobileNavItem<MobileStellarId>>>(() => {
    const base: ReadonlyArray<MobileNavItem<MobileStellarId>> = [
      { id: 'filters', label: 'Filters', iconName: 'filter' },
      { id: 'style', label: 'Style', iconName: 'palette' },
    ];
    const selected: MobileNavItem<MobileStellarId> = {
      id: 'selected',
      label: 'Selected Target',
      iconName: 'target',
    };
    const exportItem: MobileNavItem<MobileStellarId> = {
      id: 'export',
      label: 'Export',
      iconName: 'download',
    };
    return this.hasSelectedAnnotation()
      ? [...base, selected, exportItem]
      : [...base, exportItem];
  });

  /** Title to render in the expanded sheet, derived from the active section. */
  readonly sheetTitle = computed(() => {
    if (this.activeMode() === 'infographic') {
      const map: Record<MobileInfographicId, string> = {
        object: 'Object info',
        capture: 'Capture',
        equipment: 'Equipment',
        layout: 'Layout',
        export: 'Export',
      };
      return map[this.infographicSection()];
    }
    const map: Record<MobileStellarId, string> = {
      filters: 'Annotation filters',
      style: 'Annotation style',
      selected: 'Selected annotation',
      export: 'Export',
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

  /** Handles a bottom-nav activation in stellar mode. Navigation is
   * independent of selection state. */
  onStellarActivate(id: string): void {
    if (!this.isStellarId(id)) {
      return;
    }
    if (this.stellarSection() === id) {
      this.sheetExpanded.update((v) => !v);
    } else {
      this._userStellarSection.set(id);
      this.sheetExpanded.set(true);
    }
  }

  private isInfographicId(id: string): id is MobileInfographicId {
    return (
      id === 'object' ||
      id === 'capture' ||
      id === 'equipment' ||
      id === 'layout' ||
      id === 'export'
    );
  }

  private isStellarId(id: string): id is MobileStellarId {
    return id === 'filters' || id === 'style' || id === 'selected' || id === 'export';
  }
}
