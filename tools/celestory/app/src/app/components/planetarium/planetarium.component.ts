import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { CelestoryStory, StoryTarget } from '../../models/story.model';
import { initialCamera } from '../../models/sky.constants';
import type { AltAz, SkyLocation, SkyTarget } from '../../models/sky.types';
import { altAzToVec, catColor, targetRaDec, raDecToAltAz } from '../../utils/celestial.util';
import { PlanetariumRenderer } from '../../utils/planetarium-renderer.util';
import { SkyLocationStore } from '../../services/sky-location-store.service';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { TargetImageComponent } from '../target-image/target-image.component';
import { TargetDetailComponent } from '../target-detail/target-detail.component';

/**
 * "View My Universe" — a stand-inside planetarium. The user's imaged targets are
 * plotted at their true RA/Dec, projected into the local sky for their location +
 * the current moment. Drag to look around, scroll to zoom, tap a target for its
 * full imaging history. Browser-only canvas; SSR renders the chrome only.
 */
@Component({
  selector: 'dba-planetarium',
  standalone: true,
  imports: [CelIconComponent, TargetImageComponent, TargetDetailComponent],
  templateUrl: './planetarium.component.html',
  styleUrl: './planetarium.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class PlanetariumComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly locationStore = inject(SkyLocationStore);

  /** The full story (targets with RA/Dec are plotted; equipment for the popup). */
  readonly story = input.required<CelestoryStory>();

  /** Close the planetarium and return to the journey. */
  readonly closed = output<void>();
  /** Navigate to an equipment detail page (closes the planetarium). */
  readonly openEquipment = output<string>();

  private readonly wrapRef = viewChild<ElementRef<HTMLDivElement>>('wrap');
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');
  private readonly markerRefs = viewChildren<ElementRef<HTMLElement>>('marker');

  /** The instant the sky is drawn for. */
  protected readonly now = new Date();

  /** Observer location (from the persisted store). */
  protected readonly location = this.locationStore.location;
  /** Coordinate graticule visible. */
  protected readonly showGrid = signal(true);
  /** Show the one-shot interaction hint. */
  protected readonly hint = signal(true);
  /** Location editor popup open. */
  protected readonly locOpen = signal(false);
  /** Selected target id (open popup). */
  protected readonly selectedId = signal<string | null>(null);

  /** Editable location-form fields. */
  protected readonly latField = signal('');
  protected readonly lonField = signal('');
  protected readonly labelField = signal('');

  private renderer: PlanetariumRenderer | null = null;
  private framed = false;
  private drag: { x: number; y: number; moved: number } | null = null;
  private pinch: number | null = null;

  /** Targets (targets carrying RA/Dec) projected to the current sky. */
  protected readonly targets = computed<SkyTarget[]>(() => {
    const loc = this.location();
    const out: SkyTarget[] = [];
    for (const o of this.story().targets) {
      const coords = targetRaDec(o);
      if (!coords) {
        continue;
      }
      const aa = raDecToAltAz(coords[0], coords[1], loc.lat, loc.lon, this.now);
      out.push({ target: o, v: altAzToVec(aa.alt, aa.az), alt: aa.alt, az: aa.az });
    }
    return out;
  });

  /** Number of targets currently above the horizon. */
  protected readonly upCount = computed(() => this.targets().filter((t) => t.alt > 0).length);

  /** The currently selected target (if its popup is open). */
  protected readonly selected = computed<SkyTarget | null>(() => {
    const id = this.selectedId();
    if (!id) {
      return null;
    }
    return this.targets().find((t) => t.target.id === id) ?? null;
  });

  /** Alt/az of the selected target (for the popup position indicator). */
  protected readonly selectedAltAz = computed<AltAz | null>(() => {
    const t = this.selected();
    return t ? { alt: t.alt, az: t.az } : null;
  });

  /** Localised date + time string for the top bar. */
  protected readonly dateStr = computed(() => {
    const d = this.now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const t = this.now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${d} · ${t}`;
  });

  constructor() {
    // Recompute + re-frame whenever the observer location changes.
    effect(() => {
      this.location();
      const r = this.renderer;
      if (r) {
        r.recomputeSky();
        r.reset();
      }
    });

    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const wrap = this.wrapRef()?.nativeElement;
      if (!canvas || !wrap) {
        return;
      }
      const renderer = new PlanetariumRenderer(
        canvas,
        {
          location: () => this.location(),
          now: () => this.now,
          showGrid: () => this.showGrid(),
          targets: () => this.targets(),
          markerEls: () => this.markerRefs().map((r) => r.nativeElement),
        },
        initialCamera(),
      );
      this.renderer = renderer;
      this.frame();
      this.attachResize(canvas, wrap);
      this.attachPointer(canvas);
      renderer.start();
      if (this.location().status === 'default') {
        this.locate();
      }
      this.destroyRef.onDestroy(() => renderer.stop());
    });
  }

  /** Marker accent colour for a target. */
  protected markerColor(target: StoryTarget): string {
    return catColor(target.category);
  }

  /** Open a target's detail popup. */
  protected select(id: string): void {
    this.selectedId.set(id);
  }

  /** Close the target popup. */
  protected closePopup(): void {
    this.selectedId.set(null);
  }

  /** Zoom in (+) or out (−). */
  protected zoom(dir: number): void {
    this.renderer?.zoomStep(dir);
  }

  /** Reset the camera to the framed default view. */
  protected resetView(): void {
    this.renderer?.reset();
  }

  /** Toggle the coordinate graticule. */
  protected toggleGrid(): void {
    this.showGrid.update((v) => !v);
  }

  /** Open/close the location editor, seeding its fields from the current location. */
  protected toggleLocation(): void {
    const loc = this.location();
    this.latField.set(String(loc.lat));
    this.lonField.set(String(loc.lon));
    this.labelField.set(loc.label && loc.label.indexOf('°') === -1 ? loc.label : '');
    this.locOpen.update((v) => !v);
  }

  /** Persist the manually-entered location. */
  protected saveLocation(): void {
    const la = parseFloat(this.latField());
    const lo = parseFloat(this.lonField());
    if (!isFinite(la) || !isFinite(lo)) {
      return;
    }
    this.framed = false;
    this.locationStore.setLocation({
      lat: Math.max(-90, Math.min(90, la)),
      lon: ((lo + 540) % 360) - 180,
      label: this.labelField().trim() || null,
      status: 'manual',
    });
    this.locOpen.set(false);
  }

  /** Request the device's geolocation. */
  protected locate(): void {
    if (!this.isBrowser || !navigator.geolocation) {
      return;
    }
    this.locationStore.setLocation({ ...this.location(), status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.framed = false;
        this.locationStore.setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Your location', status: 'ok' });
      },
      () => this.locationStore.setLocation({ ...this.location(), status: 'denied' }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }

  /** Display string for the location button. */
  protected locLabel(loc: SkyLocation): string {
    return loc.label || `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`;
  }

  /** Equipment navigation from the embedded TargetDetail (parent closes the sky). */
  protected onOpenEquipment(id: string): void {
    this.closePopup();
    this.openEquipment.emit(id);
  }

  /** Escape closes the popup, then the planetarium. */
  protected onEscape(): void {
    if (this.selectedId()) {
      this.closePopup();
      return;
    }
    if (this.locOpen()) {
      this.locOpen.set(false);
      return;
    }
    this.closed.emit();
  }

  /** Frame the view at the celestial pole the first time. */
  private frame(): void {
    if (this.framed) {
      return;
    }
    this.renderer?.reset();
    this.framed = true;
  }

  private attachResize(canvas: HTMLCanvasElement, wrap: HTMLElement): void {
    const apply = (): void => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.renderer?.resize(r.width, r.height, dpr);
    };
    apply();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(apply);
      ro.observe(wrap);
      this.destroyRef.onDestroy(() => ro.disconnect());
    }
  }

  private attachPointer(canvas: HTMLCanvasElement): void {
    const down = (e: PointerEvent): void => {
      this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture?.(e.pointerId);
      this.hint.set(false);
    };
    const move = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d) {
        return;
      }
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      d.moved += Math.abs(dx) + Math.abs(dy);
      this.renderer?.pan(dx, dy);
    };
    const up = (): void => {
      this.drag = null;
    };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      this.renderer?.zoomBy(1 + (e.deltaY > 0 ? 0.09 : -0.09));
    };
    const tstart = (e: TouchEvent): void => {
      if (e.touches.length === 2) {
        this.pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    };
    const tmove = (e: TouchEvent): void => {
      if (e.touches.length === 2 && this.pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.renderer?.zoomBy(this.pinch / d);
        this.pinch = d;
        e.preventDefault();
      }
    };
    const tend = (): void => {
      this.pinch = null;
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('touchstart', tstart, { passive: false });
    canvas.addEventListener('touchmove', tmove, { passive: false });
    canvas.addEventListener('touchend', tend);
    this.destroyRef.onDestroy(() => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('touchstart', tstart);
      canvas.removeEventListener('touchmove', tmove);
      canvas.removeEventListener('touchend', tend);
    });
  }
}
