import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IconComponent,
  InspectorSectionComponent,
  MicroSliderComponent,
  checkIcon,
  globeIcon,
  layersIcon,
  starsIcon,
} from '@db-astro-suite/ui';
import type { AnnotationFilters } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';

/** Filter keys that are simple booleans (i.e. checkbox-driven). */
type BooleanFilterKey = Exclude<keyof AnnotationFilters, 'maxStarMagnitude'>;

/**
 * Inspector panel that drives annotation filters: which catalogs +
 * object types render, plus the max-magnitude slider for stars.
 * Replaces the filter accordion inside the legacy
 * `AnnotationControlsComponent`.
 */
@Component({
  selector: 'dba-ag-annotation-filters-panel',
  standalone: true,
  imports: [InspectorSectionComponent, MicroSliderComponent, IconComponent],
  templateUrl: './annotation-filters-panel.component.html',
  styleUrls: ['./annotation-filters-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationFiltersPanelComponent {
  private readonly dataService = inject(CardDataService);

  /** Reactive view of the stellar-map document. */
  readonly mapData = this.dataService.stellarMapData;

  /** Glyphs surfaced in section titles + check tiles. */
  protected readonly checkIcon = checkIcon;
  protected readonly globeIcon = globeIcon;
  protected readonly layersIcon = layersIcon;
  protected readonly starsIcon = starsIcon;

  /** Current filter state used by the template. */
  readonly filters = computed(() => this.mapData().filters);

  /** Flips a boolean filter by key. */
  toggle(key: BooleanFilterKey): void {
    this.dataService.stellarMapData.update((d) => ({
      ...d,
      filters: { ...d.filters, [key]: !d.filters[key] },
    }));
  }

  /** Updates the max-magnitude slider. */
  setMaxMagnitude(value: number): void {
    this.dataService.stellarMapData.update((d) => ({
      ...d,
      filters: { ...d.filters, maxStarMagnitude: value },
    }));
  }
}
