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
  isDevMode,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import type { CelestoryStory, StoryTarget } from '../../models/story.model';
import { FOV_MAX, initialCamera } from '../../models/sky.constants';
import type { AltAz, SkyLocation, SkyTarget } from '../../models/sky.types';
import type { SkyOverlayToggles } from '../../models/sky-overlay.types';
import { type DevicePointing, orientationToPointing } from '../../utils/device-orientation.util';
import { LIGHT_POLLUTION_LEVELS } from '../../models/sky-ui.constants';
import { darkestSkyTime } from '../../utils/dark-sky-time.util';
import type { DarkSkyChoice } from '../../models/sky-ui.types';
import { DEFAULT_SKY_LOOK, TYCHO_LOAD_FOV } from '../../models/sky-render.constants';
import type { SkyLook } from '../../models/sky-render.types';
import { altAzToVec, catColor, targetRaDec, raDecToAltAz } from '../../utils/celestial.util';
import { describeError } from '../../utils/describe-error.util';
import { moonPosition, sunPosition } from '../../utils/ephemeris.util';
import { equatorialToEnuMatrix, j2000ToEnuMatrix, mat3MulVec, raDecToUnit } from '../../utils/sky-frame.util';
import { formatSkyRate, formatSkyTime } from '../../utils/sky-time-format.util';
import { SkyCamera } from '../../utils/sky-camera.util';
import { SkyGlRenderer } from '../../utils/sky-gl-renderer.util';
import { SkyOverlayRenderer } from '../../utils/sky-overlay-renderer.util';
import { HipsTileService } from '../../services/hips-tile.service';
import { HipsTileCache } from '../../utils/hips-tiles.util';
import { HIPS_SURVEY } from '../../models/hips.constants';
import { SkyAssetService } from '../../services/sky-asset.service';
import { SkyLocationStore } from '../../services/sky-location-store.service';
import { SkyTimeStore } from '../../services/sky-time-store.service';
import { CelIconComponent } from '../cel-icon/cel-icon.component';
import { TargetDetailComponent } from '../target-detail/target-detail.component';

/**
 * "View My Universe" — a stand-inside planetarium. The user's imaged targets are
 * plotted at their true RA/Dec in a physically rendered sky (WebGL2 HDR: Milky
 * Way, Hipparcos/Tycho stars, atmosphere, moonlight, horizon) for their location
 * and a simulated instant they can scrub. Drag to look around, scroll to zoom,
 * tap a target for its full imaging history. Browser-only canvases; SSR renders
 * the chrome only.
 */
@Component({
  selector: 'dba-planetarium',
  standalone: true,
  imports: [CelIconComponent, TargetDetailComponent],
  templateUrl: './planetarium.component.html',
  styleUrl: './planetarium.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:keydown)': 'onKey($event)',
  },
})
export class PlanetariumComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly locationStore = inject(SkyLocationStore);
  private readonly timeStore = inject(SkyTimeStore);
  private readonly skyAssets = inject(SkyAssetService);
  private readonly hipsTiles = inject(HipsTileService);

  /** The full story (targets with RA/Dec are plotted; equipment for the popup). */
  readonly story = input.required<CelestoryStory>();
  /** The published profile's handle ('' in Private Preview), passed to the target popup's share card. */
  readonly handle = input<string>('');

  /** Close the planetarium and return to the journey. */
  readonly closed = output<void>();
  /** Navigate to an equipment detail page (closes the planetarium). */
  readonly openEquipment = output<string>();

  private readonly wrapRef = viewChild<ElementRef<HTMLDivElement>>('wrap');
  private readonly glRef = viewChild<ElementRef<HTMLCanvasElement>>('gl');
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');
  private readonly markerRefs = viewChildren<ElementRef<HTMLElement>>('marker');

  /** Observer location (from the persisted store). */
  protected readonly location = this.locationStore.location;
  /** Coordinates only, so view re-framing ignores status changes. */
  private readonly locationKey = computed(() => `${this.location().lat},${this.location().lon}`);
  /** Simulated time (published once per simulated second). */
  protected readonly time = this.timeStore.time;
  /** Playback rate (0 = paused). */
  protected readonly rate = this.timeStore.rate;
  /** True while tracking the wall clock. */
  protected readonly isLive = this.timeStore.isLive;
  /** Overlay toggles. */
  protected readonly toggles = signal<SkyOverlayToggles>({ grid: false, constellations: true, labels: true, survey: true });
  /** Survey attribution (shown while the deep-sky layer can appear). */
  protected readonly surveyCredit = HIPS_SURVEY.credit;
  /** Index into LIGHT_POLLUTION_LEVELS. */
  protected readonly pollutionIndex = signal(0);
  /** Show the one-shot interaction hint. */
  protected readonly hint = signal(true);
  /** Location editor popup open. */
  protected readonly locOpen = signal(false);
  /** Selected target id (open popup). */
  protected readonly selectedId = signal<string | null>(null);
  /** WebGL failure message (the overlay still draws). */
  protected readonly glError = signal<string | null>(null);
  /** Set when the opening view was moved forward to tonight's dark sky. */
  protected readonly jumpedToNight = signal(false);
  /** Why the opening view moved (for the hint pill). */
  protected readonly nightReason = signal<DarkSkyChoice['reason']>('now');
  /** Set once the user operates the time controls in this visit (stops auto re-jumps). */
  private readonly userTouchedClock = signal(false);
  /** "Point at the sky" (device orientation) mode. */
  protected readonly arMode = signal(false);
  /** Whether this device can offer the point-at-the-sky mode. */
  protected readonly canAr = signal(false);
  private pointing: DevicePointing | null = null;
  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  /** Editable location-form fields. */
  protected readonly latField = signal('');
  protected readonly lonField = signal('');
  protected readonly labelField = signal('');

  /** Load the 8k Milky Way once the renderer reports a capable GPU. */
  private readonly wantHiRes = signal(false);
  /** Load Tycho-2 once the user zooms in. */
  private readonly wantTycho = signal(false);

  /** Core sky assets (stars, figures, 4k Milky Way). */
  protected readonly assets = rxResource({
    params: () => this.isBrowser,
    stream: ({ params }) => (params ? this.skyAssets.loadCore() : of(undefined)),
  });
  private readonly hiRes = rxResource({
    params: () => this.wantHiRes(),
    stream: ({ params }) => (params ? this.skyAssets.loadMilkyWay({ highRes: true }) : of(undefined)),
  });
  private readonly tycho = rxResource({
    params: () => this.wantTycho(),
    stream: ({ params }) => (params ? this.skyAssets.loadTycho() : of(undefined)),
  });
  private readonly moon = rxResource({
    params: () => this.isBrowser,
    stream: ({ params }) => (params ? this.skyAssets.loadMoon() : of(undefined)),
  });

  private camera: SkyCamera | null = null;
  private overlay: SkyOverlayRenderer | null = null;
  private gl: SkyGlRenderer | null = null;
  private drag: { x: number; y: number; moved: number; vx: number; vy: number; t: number } | null = null;
  private pinch: { dist: number } | null = null;

  /** Targets (targets carrying RA/Dec) projected to the current sky. */
  protected readonly targets = computed<SkyTarget[]>(() => {
    const loc = this.location();
    const now = this.time();
    const out: SkyTarget[] = [];
    for (const o of this.story().targets) {
      const coords = targetRaDec(o);
      if (!coords) {
        continue;
      }
      const aa = raDecToAltAz(coords[0], coords[1], loc.lat, loc.lon, now);
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
  protected readonly dateStr = computed(() => formatSkyTime(this.time()));
  /** Playback rate label. */
  protected readonly rateLabel = computed(() => formatSkyRate(this.rate(), this.isLive()));
  /** Light pollution preset label. */
  protected readonly pollutionLabel = computed(() => LIGHT_POLLUTION_LEVELS[this.pollutionIndex()].label);
  /** Asset error message, if any. */
  protected readonly assetError = computed(() => {
    const e = this.assets.error() ?? this.hiRes.error() ?? this.tycho.error() ?? this.moon.error();
    return e ? describeError(e) : null;
  });

  constructor() {
    // Re-frame whenever the observer's coordinates change (not on status-only updates),
    // and re-pick tonight's dark instant if the user has not touched the clock.
    effect(() => {
      this.locationKey();
      this.resetView();
      if (this.isBrowser && !this.userTouchedClock()) {
        this.openOnDarkSky();
      }
    });
    // Feed loaded assets to the GPU as they arrive.
    effect(() => {
      const core = this.assets.value();
      const gl = this.gl;
      if (!core || !gl) {
        return;
      }
      gl.setMilkyWay(core.milkyWay);
      gl.addStars(core.stars);
      if (gl.maxTextureSize >= 8192 && !matchMedia('(pointer: coarse)').matches) {
        this.wantHiRes.set(true);
      }
    });
    effect(() => {
      const hi = this.hiRes.value();
      if (hi && this.gl) {
        this.gl.setMilkyWay(hi);
      }
    });
    effect(() => {
      const tyc = this.tycho.value();
      if (tyc && this.gl) {
        this.gl.addStars(tyc);
      }
    });
    effect(() => {
      const moon = this.moon.value();
      if (moon && this.gl) {
        this.gl.setMoon(moon);
      }
    });

    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const glCanvas = this.glRef()?.nativeElement;
      const wrap = this.wrapRef()?.nativeElement;
      if (!canvas || !glCanvas || !wrap) {
        return;
      }
      const camera = new SkyCamera(initialCamera());
      this.camera = camera;
      try {
        this.gl = new SkyGlRenderer(glCanvas);
        this.gl.setSurvey(new HipsTileCache(this.gl.context, (order, pix) => this.hipsTiles.fetchTile(order, pix)));
      } catch (err: unknown) {
        this.glError.set(describeError(err));
        this.gl = null;
      }
      const overlay = new SkyOverlayRenderer(
        canvas,
        {
          location: () => this.location(),
          now: () => this.timeStore.now(),
          toggles: () => this.toggles(),
          lightPollution: () => LIGHT_POLLUTION_LEVELS[this.pollutionIndex()].value,
          catalog: () => this.assets.value()?.catalog ?? null,
          targets: () => this.targets(),
          markerEls: () => this.markerRefs().map((r) => r.nativeElement),
        },
        camera,
        this.timeStore,
        this.gl,
      );
      this.overlay = overlay;
      this.resetView();
      camera.snap();
      this.attachResize(wrap);
      this.attachPointer(canvas);
      overlay.start();
      if (this.location().status === 'default') {
        this.locate();
      }
      this.canAr.set(matchMedia('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window);
      if (isDevMode()) {
        // Dev-only hooks for screenshot tooling: set the instant / aim the camera.
        Object.assign(window, {
          __sky: {
            setTime: (d: Date) => this.timeStore.setTime(d),
            setLook: (patch: Partial<SkyLook>) => {
              if (this.gl) {
                this.gl.look = { ...this.gl.look, ...patch };
              }
            },
            look: (heading?: number, pitch?: number, fov?: number) => {
              const s = camera.state;
              camera.lookAt(pitch ?? s.tPitch, heading ?? s.tHeading, fov ?? s.tFov);
              camera.snap();
              this.noteZoom();
            },
            state: () => ({ ...camera.state, ...(this.gl?.debug ?? {}), skyDpr: overlay.skyDpr, devicePixelRatio: window.devicePixelRatio, meteor: overlay.currentMeteor }),
            meteor: () => overlay.triggerMeteor(),
            aimRaDec: (ra: number, dec: number, fov?: number) => {
              const loc = this.location();
              const now = this.timeStore.now();
              const enu = mat3MulVec(j2000ToEnuMatrix(loc.lat, loc.lon, now), raDecToUnit(ra, dec));
              const alt = (Math.asin(enu.z) * 180) / Math.PI;
              const az = ((Math.atan2(enu.x, enu.y) * 180) / Math.PI + 360) % 360;
              camera.lookAt(alt, az, fov ?? camera.state.tFov);
              camera.snap();
              this.noteZoom();
            },
            aim: (body: 'moon' | 'sun', fov?: number) => {
              const loc = this.location();
              const now = this.timeStore.now();
              const m = equatorialToEnuMatrix(loc.lat, loc.lon, now);
              const unit = body === 'moon' ? moonPosition(now, loc.lat, loc.lon).unit : sunPosition(now).unit;
              const enu = mat3MulVec(m, unit);
              const alt = (Math.asin(enu.z) * 180) / Math.PI;
              const az = ((Math.atan2(enu.x, enu.y) * 180) / Math.PI + 360) % 360;
              camera.lookAt(alt, az, fov ?? camera.state.tFov);
              camera.snap();
              this.noteZoom();
            },
          },
        });
      }
      this.destroyRef.onDestroy(() => {
        overlay.stop();
        this.stopAr();
        this.gl?.dispose();
        // Leaving always hands the shared clock back to live time.
        this.timeStore.resetToNow();
      });
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

  /** Step zoom in (dir < 0) or out (dir >= 0) about the centre. */
  protected zoom(dir: number): void {
    const overlay = this.overlay;
    if (!this.camera || !overlay) {
      return;
    }
    this.camera.zoomAt(dir < 0 ? 0.72 : 1.38, null, overlay.params(), overlay.viewport().height);
    this.noteZoom();
  }

  /** Face north with the celestial pole at its true altitude, zoomed out. */
  protected resetView(): void {
    this.camera?.lookAt(Math.max(-80, Math.min(80, this.location().lat)), 0, FOV_MAX);
  }

  /** Start on tonight's dark sky when opened in daylight or twilight (the Now button returns). */
  private openOnDarkSky(): void {
    const loc = this.location();
    const choice = darkestSkyTime(new Date(), loc.lat, loc.lon, !DEFAULT_SKY_LOOK.alwaysNight);
    if (!choice.moved) {
      // Every opening starts from the live clock, whatever a previous visit left behind.
      this.timeStore.resetToNow();
      this.jumpedToNight.set(false);
      return;
    }
    this.timeStore.setTime(choice.time);
    this.nightReason.set(choice.reason);
    this.jumpedToNight.set(true);
  }

  /** Keyboard: arrows pan, +/- zoom, space pauses, 0 resets. */
  protected onKey(e: KeyboardEvent): void {
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return;
    }
    const overlay = this.overlay;
    if (!overlay || !this.camera) {
      return;
    }
    const step = overlay.viewport().width * 0.08;
    switch (e.key) {
      case 'ArrowLeft':
        this.camera.pan(step, 0, overlay.params());
        break;
      case 'ArrowRight':
        this.camera.pan(-step, 0, overlay.params());
        break;
      case 'ArrowUp':
        this.camera.pan(0, step, overlay.params());
        break;
      case 'ArrowDown':
        this.camera.pan(0, -step, overlay.params());
        break;
      case '+':
      case '=':
        this.zoom(-1);
        break;
      case '-':
      case '_':
        this.zoom(1);
        break;
      case ' ':
        this.togglePause();
        break;
      case '0':
        this.resetView();
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  /** Toggle "point at the sky": follow the phone's orientation (asks permission on iOS). */
  protected async toggleAr(): Promise<void> {
    if (this.arMode()) {
      this.stopAr();
      return;
    }
    const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    // iOS gates orientation events behind a user-gesture permission prompt; the cast above
    // is the only way to reach that non-standard static method.
    if (typeof ctor.requestPermission === 'function') {
      try {
        const res = await ctor.requestPermission();
        if (res !== 'granted') {
          return;
        }
      } catch {
        return;
      }
    }
    const handler = (e: DeviceOrientationEvent): void => {
      if (e.alpha == null || e.beta == null || e.gamma == null) {
        return;
      }
      const withHeading = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      // Safari reports compass heading separately; alpha there is relative to the start.
      const alpha = withHeading.webkitCompassHeading != null ? 360 - withHeading.webkitCompassHeading : e.alpha;
      this.pointing = orientationToPointing(alpha, e.beta, e.gamma, screen.orientation?.angle ?? 0);
      const p = this.pointing;
      this.camera?.lookAt(p.pitch, p.heading);
    };
    this.orientationHandler = handler;
    window.addEventListener('deviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation', handler);
    this.arMode.set(true);
    this.hint.set(false);
  }

  private stopAr(): void {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientationabsolute', this.orientationHandler);
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }
    this.arMode.set(false);
  }

  /** Toggle one overlay layer. */
  protected toggle(key: keyof SkyOverlayToggles): void {
    this.toggles.update((t) => ({ ...t, [key]: !t[key] }));
    if (key === 'survey' && this.gl) {
      this.gl.surveyEnabled = this.toggles().survey;
    }
  }

  /** Cycle the light-pollution preset. */
  protected cyclePollution(): void {
    this.pollutionIndex.update((i) => (i + 1) % LIGHT_POLLUTION_LEVELS.length);
  }

  /** Pause / resume simulated time. */
  protected togglePause(): void {
    this.timeStore.togglePause();
    this.jumpedToNight.set(false);
    this.userTouchedClock.set(true);
  }

  /** Cycle the playback rate. */
  protected faster(): void {
    this.timeStore.faster();
    this.jumpedToNight.set(false);
    this.userTouchedClock.set(true);
  }

  /** Shift simulated time by whole hours. */
  protected shiftHours(h: number): void {
    this.timeStore.shiftBy(h * 3600 * 1000);
    this.jumpedToNight.set(false);
    this.userTouchedClock.set(true);
  }

  /** Return to the live clock. */
  protected resetTime(): void {
    this.timeStore.resetToNow();
    this.jumpedToNight.set(false);
    this.userTouchedClock.set(true);
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

  /** Escape closes the popup, then the location editor, then the planetarium. */
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

  private noteZoom(): void {
    const fov = this.camera?.state.tFov ?? FOV_MAX;
    if (fov < TYCHO_LOAD_FOV) {
      this.wantTycho.set(true);
    }
  }

  private attachResize(wrap: HTMLElement): void {
    const apply = (): void => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(matchMedia('(pointer: coarse)').matches ? 1.5 : 2, window.devicePixelRatio || 1);
      this.overlay?.resize(r.width, r.height, dpr);
    };
    apply();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(apply);
      ro.observe(wrap);
      this.destroyRef.onDestroy(() => ro.disconnect());
    }
  }

  private attachPointer(canvas: HTMLCanvasElement): void {
    const local = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent): void => {
      if (this.arMode()) {
        this.stopAr();
      }
      this.camera?.stop();
      this.drag = { x: e.clientX, y: e.clientY, moved: 0, vx: 0, vy: 0, t: performance.now() };
      canvas.setPointerCapture?.(e.pointerId);
      this.hint.set(false);
    };
    const move = (e: PointerEvent): void => {
      const d = this.drag;
      const overlay = this.overlay;
      if (!d || !overlay || this.pinch) {
        return;
      }
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      const now = performance.now();
      const dt = Math.max(1, now - d.t) / 1000;
      d.vx = 0.6 * d.vx + 0.4 * (dx / dt);
      d.vy = 0.6 * d.vy + 0.4 * (dy / dt);
      d.x = e.clientX;
      d.y = e.clientY;
      d.t = now;
      d.moved += Math.abs(dx) + Math.abs(dy);
      this.camera?.pan(dx, dy, overlay.params());
    };
    const up = (): void => {
      const d = this.drag;
      const overlay = this.overlay;
      if (d && overlay && performance.now() - d.t < 80 && Math.hypot(d.vx, d.vy) > 120) {
        this.camera?.fling(d.vx, d.vy, overlay.params());
      }
      this.drag = null;
    };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      const overlay = this.overlay;
      if (!overlay) {
        return;
      }
      // Mouse wheels send ±100 per notch; trackpads stream small deltas; pinch arrives as
      // ctrl+wheel with tiny deltas; some browsers report lines rather than pixels.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const delta = e.deltaY * unit * (e.ctrlKey ? 6 : 1);
      const factor = Math.exp(Math.max(-1, Math.min(1, delta / 240)) * 0.35);
      this.camera?.zoomAt(factor, local(e), overlay.params(), overlay.viewport().height);
      this.noteZoom();
    };
    const dbl = (e: MouseEvent): void => {
      const overlay = this.overlay;
      if (!overlay) {
        return;
      }
      this.camera?.zoomAt(0.5, local(e), overlay.params(), overlay.viewport().height);
      this.noteZoom();
    };
    const tstart = (e: TouchEvent): void => {
      if (e.touches.length === 2) {
        const a = e.touches[0];
        const b = e.touches[1];
        this.pinch = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
      }
    };
    const tmove = (e: TouchEvent): void => {
      const overlay = this.overlay;
      if (e.touches.length === 2 && this.pinch && overlay) {
        const a = e.touches[0];
        const b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const mid = local({ clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 });
        this.camera?.zoomAt(this.pinch.dist / dist, mid, overlay.params(), overlay.viewport().height);
        this.pinch = { dist };
        this.noteZoom();
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
    canvas.addEventListener('dblclick', dbl);
    canvas.addEventListener('touchstart', tstart, { passive: false });
    canvas.addEventListener('touchmove', tmove, { passive: false });
    canvas.addEventListener('touchend', tend);
    this.destroyRef.onDestroy(() => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('dblclick', dbl);
      canvas.removeEventListener('touchstart', tstart);
      canvas.removeEventListener('touchmove', tmove);
      canvas.removeEventListener('touchend', tend);
    });
  }
}
