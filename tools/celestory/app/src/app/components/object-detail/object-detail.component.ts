import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CelestoryLedger, LedgerEquipment, LedgerObject } from '../../models/ledger.model';
import type { CelIconName } from '../cel-icon/cel-icon.component';
import type { FilterRow, SessionView } from '../../models/portfolio-view.types';
import type { AltAz } from '../../models/sky.types';
import { formatCount, formatDuration } from '../../utils/format.util';
import { moonGlyphFor } from '../../utils/moon-phase.util';
import {
  categoryIcon,
  equipNameMap,
  filterRows,
  fmtDate,
  sessionViews,
} from '../../utils/portfolio.util';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { MoonGlyphComponent } from '../moon-glyph/moon-glyph.component';
import { ObjectImageComponent } from '../object-image/object-image.component';
import { ObjectShareModalComponent } from '../object-share-modal/object-share-modal.component';

/** Object detail: hero image, totals, aliases, per-filter rows, gear, session timeline. */
@Component({
  selector: 'dba-object-detail',
  standalone: true,
  imports: [CelIconComponent, MoonGlyphComponent, ObjectImageComponent, ObjectShareModalComponent],
  templateUrl: './object-detail.component.html',
  styleUrl: './object-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.in-modal]': 'embedded()' },
})
export class ObjectDetailComponent {
  /** The object to show. */
  readonly obj = input.required<LedgerObject>();
  /** The full ledger (for equipment resolution). */
  readonly ledger = input.required<CelestoryLedger>();
  /** Rendered inside the planetarium popup (hides the back link, compacts the head). */
  readonly embedded = input<boolean>(false);
  /** Current horizontal position, when shown from the planetarium. */
  readonly altaz = input<AltAz | null>(null);

  /** Return to the objects list. */
  readonly back = output<void>();
  /** Open a piece of equipment by id. */
  readonly openEquipment = output<string>();

  /** Whether the per-object share modal is open. */
  protected readonly showShare = signal(false);

  /** Category glyph. */
  protected readonly icon = computed<CelIconName>(() => categoryIcon(this.obj().category));
  /** Per-filter integration rows. */
  protected readonly rows = computed<FilterRow[]>(() => filterRows(this.obj().filters));
  /** Equipment used (resolved). */
  protected readonly gear = computed<LedgerEquipment[]>(() => {
    const byId = new Map(this.ledger().equipment.map((e) => [e.id, e] as const));
    return this.obj().equipmentIds.map((id) => byId.get(id)).filter((e): e is LedgerEquipment => !!e);
  });
  /** Session timeline view-models. */
  protected readonly sessions = computed<SessionView[]>(() =>
    sessionViews(this.obj().sessions, equipNameMap(this.ledger())),
  );

  protected dur(s: number): string {
    return formatDuration(s);
  }
  protected round(n: number): number {
    return Math.round(n);
  }
  protected count(n: number): string {
    return formatCount(n);
  }
  protected date(d: string): string {
    return fmtDate(d);
  }
  /** Lunar-phase name for a session date (e.g. "Waxing Gibbous"). */
  protected moonName(d: string): string {
    return moonGlyphFor(d).name;
  }
  /** camera/optic glyph for a gear chip. */
  protected gearIcon(e: LedgerEquipment): CelIconName {
    return e.kind.toLowerCase() === 'camera' ? 'camera' : 'optic';
  }
}
