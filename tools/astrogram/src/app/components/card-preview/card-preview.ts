import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  computed,
  OnInit,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CardDataService } from '../../services/card-data.service';
import { ExportCoordinatorService } from '../../services/export-coordinator.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';
import { resolveCardTheme } from '../card-themes/card-themes.constants';

/**
 * Infographic card host. Renders the selected card theme via
 * `NgComponentOutlet` inside `BaseCardPreviewComponent`, which owns the
 * export pipeline (modern-screenshot). Public `exportCard()` lets the
 * surrounding shell trigger an export without coupling to internals.
 */
@Component({
  selector: 'dba-ag-card-preview',
  standalone: true,
  imports: [BaseCardPreviewComponent, NgComponentOutlet],
  templateUrl: './card-preview.html',
  styleUrls: ['./card-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPreviewComponent implements OnInit {
  readonly dataService = inject(CardDataService);
  private readonly exportCoordinator = inject(ExportCoordinatorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cardData = this.dataService.cardData;
  private readonly base = viewChild.required<BaseCardPreviewComponent>('base');

  /** Component class of the active theme (falls back to the default). */
  readonly activeThemeComponent = computed(
    () => resolveCardTheme(this.cardData().cardTheme).component,
  );

  ngOnInit(): void {
    const unregister = this.exportCoordinator.register(() => this.exportCard());
    this.destroyRef.onDestroy(unregister);
  }

  /** Triggers the underlying export pipeline (used by the top bar). */
  exportCard(): void {
    this.base().exportCard();
  }
}
