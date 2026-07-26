import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StarNode } from '../../models/portfolio-view.types';

const W = 380;
const H = 132;

/**
 * A procedural, deterministic decorative constellation (stars joined by a faint
 * polyline). Drawn in `currentColor` so the parent tints it. Seeded → stable.
 */
@Component({
  selector: 'dba-constellation',
  standalone: true,
  templateUrl: './constellation.component.html',
  styleUrl: './constellation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstellationComponent {
  /** Deterministic seed. */
  readonly seed = input<number>(1);
  /** Number of stars. */
  readonly stars = input<number>(6);

  protected readonly viewBox = `0 0 ${W} ${H}`;

  /** Computed star nodes. */
  protected readonly nodes = computed<StarNode[]>(() => {
    const n = this.stars();
    let s = this.seed() * 99991 + 7;
    const rnd = (): number => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const out: StarNode[] = [];
    for (let i = 0; i < n; i++) {
      const x = 14 + (W - 28) * (i / (n - 1)) + (rnd() - 0.5) * (W / n) * 0.5;
      const y = 16 + rnd() * (H - 32);
      out.push({ x, y, big: i % 3 === 0 });
    }
    return out;
  });

  /** Polyline points string. */
  protected readonly poly = computed(() =>
    this.nodes().map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
  );
}
