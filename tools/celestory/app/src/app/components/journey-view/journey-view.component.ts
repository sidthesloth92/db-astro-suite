import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import type { DetailRef, JourneyState } from '../../models/journey.types';
import type { CelestoryLedger, LedgerEquipment, LedgerObject } from '../../models/ledger.model';
import { copyToClipboard } from '../../utils/clipboard.util';
import { formatCount, formatHours } from '../../utils/format.util';
import { PreviewStore } from '../../services/preview-store.service';
import { SessionStore } from '../../services/session-store.service';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { CelestoryWordmarkComponent } from '../celestory-wordmark/celestory-wordmark.component';
import { EquipmentDetailComponent } from '../equipment-detail/equipment-detail.component';
import { EquipmentSectionComponent } from '../equipment-section/equipment-section.component';
import { GettingStartedModalComponent } from '../getting-started-modal/getting-started-modal.component';
import { JourneyHeroComponent } from '../journey-hero/journey-hero.component';
import { ObjectDetailComponent } from '../object-detail/object-detail.component';
import { ObjectSectionComponent } from '../object-section/object-section.component';
import { PlanetariumComponent } from '../planetarium/planetarium.component';
import { PublishModalComponent } from '../publish-modal/publish-modal.component';
import { SectionBannerComponent } from '../section-banner/section-banner.component';
import { ShareStudioModalComponent } from '../share-studio-modal/share-studio-modal.component';

/**
 * Shared journey shell rendered by /preview (Private Preview), /user/vera (Demo)
 * and /user/<handle> (Published). Renders a single flowing page — journey hero,
 * Objects catalogue, Equipment rig — or an in-page object/equipment detail. The
 * top banner + actions vary by state. Hosts the Getting Started, Share, Publish
 * and Story-Slides modals.
 */
@Component({
  selector: 'dba-journey-view',
  standalone: true,
  imports: [
    RouterLink,
    ConstellationFieldComponent,
    CelIconComponent,
    CelestoryWordmarkComponent,
    JourneyHeroComponent,
    SectionBannerComponent,
    ObjectSectionComponent,
    EquipmentSectionComponent,
    ObjectDetailComponent,
    EquipmentDetailComponent,
    GettingStartedModalComponent,
    PublishModalComponent,
    ShareStudioModalComponent,
    PlanetariumComponent,
  ],
  templateUrl: './journey-view.component.html',
  styleUrl: './journey-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class JourneyViewComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /** Client-side session: holds the delete token shown in the published banner. */
  protected readonly session = inject(SessionStore);
  private readonly previewStore = inject(PreviewStore);

  constructor() {
    // If the user picked "Create your Celestory" on upload, open publish on arrival.
    afterNextRender(() => {
      if (this.previewStore.autoPublish() && this.state() === 'preview') {
        this.previewStore.autoPublish.set(false);
        this.openPublish();
      }
    });
  }

  /** Which state to present (banner + actions). */
  readonly state = input.required<JourneyState>();
  /** The ledger to visualize. */
  readonly ledger = input.required<CelestoryLedger>();
  /** The handle (empty for Private Preview). */
  readonly handle = input<string>('');

  /** Modal visibility. */
  protected readonly showGettingStarted = signal(false);
  protected readonly showPublish = signal(false);
  /** The Share Studio drawer (opened directly from any "Share" action). */
  protected readonly showStudio = signal(false);
  /** Flashes after a successful copy. */
  protected readonly copied = signal(false);
  /** Flashes after copying the delete token. */
  protected readonly tokenCopied = signal(false);
  /** Which phase to open the publish modal in ('' = full flow, 'delete' = delete confirm). */
  protected readonly publishPhase = signal<'' | 'delete'>('');

  /**
   * Open detail, driven by URL query params (`?object=` / `?equipment=`) so the
   * browser Back button closes the detail and returns to the journey overview
   * instead of leaving the page.
   */
  private readonly detailParams = toSignal(
    this.route.queryParamMap.pipe(
      map((pm) => ({ object: pm.get('object'), equipment: pm.get('equipment'), view: pm.get('view') })),
    ),
    { initialValue: { object: null as string | null, equipment: null as string | null, view: null as string | null } },
  );

  /** Whether the full-screen planetarium ("View My Universe") is open. */
  protected readonly showSky = computed(() => this.detailParams().view === 'sky');

  /** The open object/equipment detail, or null for the flowing page. */
  protected readonly detail = computed<DetailRef | null>(() => {
    const p = this.detailParams();
    if (p.object) {
      return { kind: 'object', id: p.object };
    }
    if (p.equipment) {
      return { kind: 'equipment', id: p.equipment };
    }
    return null;
  });

  /** The resolved object detail, or null. */
  protected readonly detailObject = computed<LedgerObject | null>(() => {
    const d = this.detail();
    if (d?.kind !== 'object') {
      return null;
    }
    return this.ledger().objects.find((o) => o.id === d.id) ?? null;
  });
  /** The resolved equipment detail, or null. */
  protected readonly detailEquip = computed<LedgerEquipment | null>(() => {
    const d = this.detail();
    if (d?.kind !== 'equipment') {
      return null;
    }
    return this.ledger().equipment.find((e) => e.id === d.id) ?? null;
  });

  /** Objects section sub line. */
  protected readonly objectsSub = computed(() => {
    const objects = this.ledger().objects;
    const seconds = objects.reduce((s, o) => s + o.totalIntegrationSeconds, 0);
    return `${formatCount(objects.length)} targets · ${formatHours(seconds)}h captured`;
  });
  /** Equipment section sub line. */
  protected readonly equipmentSub = computed(() => {
    const equip = this.ledger().equipment;
    const cameras = equip.filter((e) => e.kind.toLowerCase() === 'camera').length;
    return `${formatCount(cameras)} cameras · ${formatCount(equip.length - cameras)} optics`;
  });

  /** Canonical public URL of this profile (origin-aware, SSR-safe fallback). */
  protected readonly profileUrl = computed(() => {
    const origin =
      typeof location !== 'undefined' ? location.origin : 'https://celestory.dbastrosuite.com';
    return `${origin}/user/${this.handle()}`;
  });

  /** Opens an object's detail (pushes a history entry). */
  openObject(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { object: id, equipment: null },
      queryParamsHandling: 'merge',
    });
    this.scrollTop();
  }
  /** Opens an equipment item's detail (pushes a history entry). */
  openEquipment(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { equipment: id, object: null },
      queryParamsHandling: 'merge',
    });
    this.scrollTop();
  }
  /** Returns to the flowing page (clears the detail query params). */
  closeDetail(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { object: null, equipment: null },
      queryParamsHandling: 'merge',
    });
    this.scrollTop();
  }
  /** Opens the full-screen planetarium ("View My Universe"). */
  openSky(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'sky', object: null, equipment: null },
      queryParamsHandling: 'merge',
    });
  }
  /** Closes the planetarium, returning to the journey. */
  closeSky(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge',
    });
  }
  /** From the planetarium, open an equipment detail (closes the sky). */
  skyToEquipment(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { equipment: id, object: null, view: null },
      queryParamsHandling: 'merge',
    });
    this.scrollTop();
  }
  private scrollTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Opens the Share Studio drawer directly. */
  openShare(): void {
    this.showStudio.set(true);
  }
  /** Opens the Publish modal directly (full flow). */
  openPublish(): void {
    this.publishPhase.set('');
    this.showPublish.set(true);
  }
  /** Opens the Publish modal straight to the delete-confirm phase. */
  openPublishDelete(): void {
    this.publishPhase.set('delete');
    this.showPublish.set(true);
  }
  /** Copies the one-time delete token and flashes feedback. */
  copyToken(): void {
    const token = this.session.deleteToken();
    if (!token) {
      return;
    }
    void copyToClipboard(token).then((ok) => {
      if (!ok) {
        return;
      }
      this.tokenCopied.set(true);
      setTimeout(() => this.tokenCopied.set(false), 1400);
    });
  }
  /** Opens the Getting Started modal (Demo state CTA). */
  openGettingStarted(): void {
    this.showGettingStarted.set(true);
  }

  /** Publish succeeded: close the modal and enter the Published Profile state. */
  onPublished(handle: string): void {
    this.showPublish.set(false);
    void this.router.navigate(['/user', handle]);
  }

  /** Profile deleted: close the modal and return to the Private Preview. */
  onUnpublished(): void {
    this.showPublish.set(false);
    void this.router.navigate(['/preview']);
  }

  /** Copies the public profile URL and flashes feedback. */
  copyLink(): void {
    void copyToClipboard(this.profileUrl()).then((ok) => {
      if (!ok) {
        return;
      }
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1400);
    });
  }

  /** Opens the public profile URL in a new tab. */
  openProfile(): void {
    if (typeof window !== 'undefined') {
      window.open(this.profileUrl(), '_blank', 'noopener');
    }
  }

  /** Shares via the Web Share API, falling back to copying the URL. */
  share(): void {
    if (typeof navigator === 'undefined') {
      return;
    }
    const payload = {
      title: 'Celestory',
      text: 'Chart your astrophotography journey under the stars.',
      url: this.profileUrl(),
    };
    if (navigator.share) {
      // A user-cancelled share rejects; that is expected and safely ignored.
      void navigator.share(payload).catch(() => undefined);
    } else {
      this.copyLink();
    }
  }

  /** Escape closes any open modal; with no modal open, it closes an open detail. */
  onEscape(): void {
    const anyModalOpen =
      this.showGettingStarted() || this.showPublish() || this.showStudio();
    if (anyModalOpen) {
      this.showGettingStarted.set(false);
      this.showPublish.set(false);
      this.showStudio.set(false);
      return;
    }
    if (this.detail()) {
      this.closeDetail();
    }
  }
}
