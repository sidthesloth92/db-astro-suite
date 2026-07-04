import { RouteMeta } from '@analogjs/router';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/**
 * Dev-only gallery of the live 1200×630 OpenGraph cards at `/dev/og`. Renders an
 * `<img>` for each variant (brand, leaderboards, profile, target, equipment) so
 * the server-rendered cards can be eyeballed locally. Marked noindex; the
 * profile/target/equipment variants need a published handle + DATABASE_URL (they
 * fall back to the brand card otherwise).
 */

/** Dev tool — never index it. SSR-rendered noindex via routeMeta. */
export const routeMeta: RouteMeta = {
  title: 'OG card preview — Celestory (dev)',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};

@Component({
  selector: 'dba-dev-og-preview',
  standalone: true,
  templateUrl: './og.page.html',
  styleUrl: './og.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DevOgPreviewPageComponent {
  /** Handle used by the profile / target / equipment previews. */
  protected readonly handle = signal('astrowithdb');
  /** Target id used by the target preview. */
  protected readonly targetId = signal('aeaurigae');
  /** Equipment id used by the equipment preview. */
  protected readonly equipmentId = signal('cam-2600mm');

  /** The card variants to preview, keyed off the current handle / ids. */
  protected readonly cards = computed(() => {
    const h = encodeURIComponent(this.handle().trim() || 'astrowithdb');
    const o = this.targetId().trim();
    const e = this.equipmentId().trim();
    const list = [
      { label: 'Brand (default)', src: '/api/og/default' },
      { label: 'Leaderboards', src: '/api/og/default?variant=leaderboards' },
      { label: 'Profile', src: `/api/og/user/${h}` },
    ];
    if (o) {
      list.push({ label: `Target · ${o}`, src: `/api/og/user/${h}?target=${encodeURIComponent(o)}` });
    }
    if (e) {
      list.push({
        label: `Equipment · ${e}`,
        src: `/api/og/user/${h}?equipment=${encodeURIComponent(e)}`,
      });
    }
    return list;
  });

  /** Update the handle used by the previews. */
  setHandle(value: string): void {
    this.handle.set(value);
  }
  /** Update the target id used by the target preview. */
  setTargetId(value: string): void {
    this.targetId.set(value);
  }
  /** Update the equipment id used by the equipment preview. */
  setEquipmentId(value: string): void {
    this.equipmentId.set(value);
  }
}
