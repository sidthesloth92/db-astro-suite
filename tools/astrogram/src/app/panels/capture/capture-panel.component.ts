import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AnalyticsService,
  FilterIconComponent,
  InspectorSectionComponent,
  MountainIconComponent,
  PillBadgeComponent,
  SwitchComponent,
} from '@db-astro-suite/ui';
import {
  calculateTotalIntegration,
  FilterExposure,
  formatDuration,
} from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';

/**
 * Inspector panel for per-filter integration and Bortle scale. Replaces
 * the legacy `IntegrationSettingsComponent` + `BortleSettingsComponent`.
 * All edits flow through `CardDataService` mutations; Bortle changes are
 * tracked through the existing analytics surface.
 */
@Component({
  selector: 'dba-ag-capture-panel',
  standalone: true,
  imports: [
    InspectorSectionComponent,
    SwitchComponent,
    PillBadgeComponent,
    FilterIconComponent,
    MountainIconComponent,
  ],
  templateUrl: './capture-panel.component.html',
  styleUrls: ['./capture-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapturePanelComponent {
  private readonly dataService = inject(CardDataService);
  private readonly analyticsService = inject(AnalyticsService);

  /** Current card document. */
  readonly cardData = this.dataService.cardData;

  /** Formatted total integration string (e.g. "10h 20m"). */
  readonly totalIntegration = computed(() =>
    formatDuration(calculateTotalIntegration(this.cardData().filters)),
  );

  /** Class label for the Bortle pill (e.g. "Class 9"). */
  readonly bortleClassLabel = computed(() => `Class ${this.cardData().bortleScale}`);

  /** Indices of fixed filters (the 7 standard ones); the rest are user-added. */
  readonly bortleSteps: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  /**
   * Fixed colours for the 9 Bortle levels — kept here (not in tokens) because
   * the gradient is the data, not a theme token; the *brand* colours used
   * elsewhere bind to `var(--db-color-*)`. CSS bindings below pick a colour
   * from this list per cell.
   */
  readonly bortleColors: ReadonlyArray<string> = [
    '#0a2647',
    '#144272',
    '#205295',
    '#2c74b3',
    '#5ae08a',
    '#ffd23d',
    '#ff8b3d',
    '#ff6b3d',
    '#ff2d95',
  ];

  /** Filter rows used by the @for loop, exposed with stable indices. */
  readonly filterRows = computed(() =>
    this.cardData().filters.map((filter, index) => ({ filter, index })),
  );

  /** Toggles the enabled state of a filter by index. */
  toggleFilter(index: number): void {
    this.dataService.mutateData((data) => {
      data.filters[index].enabled = !data.filters[index].enabled;
    });
  }

  /** Patches the `frames` count for a filter. */
  setFrames(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const parsed = Number.parseInt(target.value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    this.dataService.mutateData((data) => {
      data.filters[index].frames = parsed;
    });
  }

  /** Patches the per-frame `seconds` for a filter. */
  setSeconds(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const parsed = Number.parseInt(target.value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    this.dataService.mutateData((data) => {
      data.filters[index].seconds = parsed;
    });
  }

  /** Patches the displayed name for a user-added filter. */
  setName(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.dataService.mutateData((data) => {
      data.filters[index].name = target.value;
    });
  }

  /** Patches the colour of a filter (from the native colour picker). */
  setColor(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.dataService.mutateData((data) => {
      data.filters[index].color = target.value;
    });
  }

  /** Appends a new custom filter row. */
  addCustomFilter(): void {
    this.dataService.mutateData((data) => {
      data.filters.push({
        name: 'Custom',
        color: '#ff00ff',
        frames: 0,
        seconds: 0,
        enabled: true,
      });
    });
  }

  /** Removes a custom filter by index. */
  removeFilter(index: number): void {
    this.dataService.mutateData((data) => {
      data.filters.splice(index, 1);
    });
  }

  /** True when the row index represents a user-added (custom) filter. */
  isCustom(index: number, filter: FilterExposure): boolean {
    // First seven rows are the standard set seeded by DEFAULT_FILTERS.
    return index >= 7 || filter.name === 'Custom';
  }

  /** Sets the current Bortle scale and emits a settings analytics event. */
  setBortle(n: number): void {
    this.analyticsService.trackSettingChanged('bortle_scale', n);
    this.dataService.updateData({ bortleScale: n });
  }
}
