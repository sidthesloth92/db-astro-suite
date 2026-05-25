import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AnalyticsService,
  IconComponent,
  InspectorSectionComponent,
  PillBadgeComponent,
  SwitchComponent,
  filterIcon,
  mountainIcon,
} from '@db-astro-suite/ui';
import {
  calculateTotalIntegration,
  FilterExposure,
  formatDuration,
} from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { BORTLE_GRADIENT_STOPS } from './bortle.constants';
import { ASTROGRAM_CUSTOM_FILTER_COLOR } from '../../constants/colors.constants';

/**
 * Inspector panel for per-filter integration and Bortle scale. Replaces
 * the legacy `IntegrationSettingsComponent` + `BortleSettingsComponent`.
 * All edits flow through `CardDataService` mutations; Bortle changes are
 * tracked through the existing analytics surface.
 */
@Component({
  selector: 'dba-ag-capture-panel',
  standalone: true,
  imports: [InspectorSectionComponent, SwitchComponent, PillBadgeComponent, IconComponent],
  templateUrl: './capture-panel.component.html',
  styleUrls: ['./capture-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapturePanelComponent {
  private readonly dataService = inject(CardDataService);
  private readonly analyticsService = inject(AnalyticsService);

  /** Current card document. */
  readonly cardData = this.dataService.cardData;

  /** Filter glyph rendered next to the Filter Integration section title. */
  protected readonly filterIcon = filterIcon;
  /** Mountain glyph rendered next to the Bortle Scale section title. */
  protected readonly mountainIcon = mountainIcon;

  /** Formatted total integration string (e.g. "10h 20m"). */
  readonly totalIntegration = computed(() =>
    formatDuration(calculateTotalIntegration(this.cardData().filters)),
  );

  /** Indices of fixed filters (the 7 standard ones); the rest are user-added. */
  readonly bortleSteps: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  /**
   * Fixed colours for the 9 Bortle levels — kept as data (not theme
   * tokens) because the gradient encodes the Bortle scale itself, not a
   * brand colour. Sourced from `bortle.constants.ts`.
   */
  readonly bortleColors: ReadonlyArray<string> = BORTLE_GRADIENT_STOPS;

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
        color: ASTROGRAM_CUSTOM_FILTER_COLOR,
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
