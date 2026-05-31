import { DecimalPipe, NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  minusIcon,
  PillBadgeComponent,
  plusIcon,
  rotateCcwIcon,
  trashIcon,
} from '@db-astro-suite/ui';
import { findHitAnnotationId } from '../../utils/annotation-hit-test.util';
import { isNamedAnnotation } from '../../utils/annotation-named.util';
import { formatLightYears } from '../../utils/format-distance.util';
import {
  clampZoom,
  IDENTITY_VIEW,
  panByScreenDelta,
  zoomAtPoint,
} from '../../utils/stellar-view.util';
import { ImageAnnotation } from '../../models/annotation.models';
import { ViewState } from '../../models/stellar-view.model';
import { StellarUploadPanelComponent } from '../../panels/stellar-upload/stellar-upload-panel.component';
import { CardDataService } from '../../services/card-data.service';
import { ExportCoordinatorService } from '../../services/export-coordinator.service';
import { BaseCardPreviewComponent } from '../base-card-preview/base-card-preview';
import { WHEEL_ZOOM_SENSITIVITY, ZOOM_BUTTON_FACTOR } from './stellar-view.constants';

/**
 * Stellar-map preview surface. Wraps `BaseCardPreviewComponent` and
 * owns the canvas-level interactions (drag, hit-test, annotation
 * rendering). Upload / Solve flow is delegated to
 * `StellarUploadPanelComponent`, projected as an overlay when no image
 * is loaded. Adds a floating top toolbar (Add / Select / object count
 * pill) on top of the preview when an image is present.
 */
@Component({
  selector: 'dba-ag-stellar-map-preview',
  standalone: true,
  imports: [
    NgClass,
    NgStyle,
    DecimalPipe,
    BaseCardPreviewComponent,
    StellarUploadPanelComponent,
    IconButtonComponent,
    IconComponent,
    PillBadgeComponent,
  ],
  templateUrl: './stellar-map-preview.html',
  styleUrls: ['./stellar-map-preview.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StellarMapPreviewComponent implements OnInit {
  private readonly dataService = inject(CardDataService);
  private readonly exportCoordinator = inject(ExportCoordinatorService);
  private readonly destroyRef = inject(DestroyRef);
  readonly mapData = this.dataService.stellarMapData;
  readonly cardData = this.dataService.cardData;
  readonly selectedAnnotationId = this.dataService.selectedAnnotationId;

  /** When true, suppresses the `@author` text in the title bar (used by the mobile shell where the top bar is already cramped). */
  readonly hideAuthor = input<boolean>(false);

  ngOnInit(): void {
    const unregister = this.exportCoordinator.register(() => this.exportCard());
    this.destroyRef.onDestroy(unregister);
  }

  /** Plus glyph used on the Add annotation FAB. */
  protected readonly plusIcon = plusIcon;
  /** Trash glyph used on the in-toolbar delete-selected button. */
  protected readonly trashIcon = trashIcon;
  /** Minus glyph used on the zoom-out button. */
  protected readonly minusIcon = minusIcon;
  /** Reset glyph used on the reset-view button. */
  protected readonly rotateCcwIcon = rotateCcwIcon;

  // ── Zoom / pan view state ──────────────────────────────────────────────────
  /** Current zoom multiplier + pan offsets driving the shared layer transform. */
  private readonly view = signal<ViewState>(IDENTITY_VIEW);
  /** CSS transform string forwarded to the base card's zoomable layers. */
  readonly viewTransform = computed(() => {
    const v = this.view();
    // Round to 4 dp so floating-point drift from the projection math doesn't
    // leak sub-pixel noise (e.g. `-19.999996%`) into the emitted CSS.
    const round = (n: number): number => Number(n.toFixed(4));
    return `translate(${round(v.panXPct)}%, ${round(v.panYPct)}%) scale(${round(v.zoom)})`;
  });
  /** True when the map is zoomed in (drives pan affordance + reset/zoom-out enablement). */
  readonly isZoomed = computed(() => this.view().zoom > 1);

  /** Resets the view to fit whenever the background image changes (new upload or clear). */
  private readonly _backgroundImage = computed(() => this.mapData().backgroundImage);
  private readonly _resetViewOnImageChange = effect(() => {
    this._backgroundImage();
    this.view.set(IDENTITY_VIEW);
  });

  /** Zooms in one step about the card centre. */
  zoomIn(): void {
    this.view.update((v) => zoomAtPoint(v, 0.5, 0.5, v.zoom * ZOOM_BUTTON_FACTOR));
  }

  /** Zooms out one step about the card centre. */
  zoomOut(): void {
    this.view.update((v) => zoomAtPoint(v, 0.5, 0.5, v.zoom / ZOOM_BUTTON_FACTOR));
  }

  /** Snaps the view back to fit (zoom 1, no pan). */
  resetView(): void {
    this.view.set(IDENTITY_VIEW);
  }

  /**
   * Cursor-centered wheel zoom. The content point under the pointer stays put
   * while the surrounding image scales. `preventDefault` stops the page from
   * scrolling underneath the gesture.
   */
  onWheel(event: WheelEvent): void {
    if (!this.mapData().backgroundImage) return;
    event.preventDefault();
    const rect = this.annotationsLayerRef().nativeElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;
    this.view.update((current) =>
      zoomAtPoint(current, u, v, current.zoom * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY)),
    );
  }

  /** The currently-selected annotation, or `null` when nothing is selected. */
  readonly selectedAnnotation = computed<ImageAnnotation | null>(() => {
    const id = this.selectedAnnotationId();
    if (!id) return null;
    return this.mapData().annotations.find((ann) => ann.id === id) ?? null;
  });

  /** Removes the currently-selected annotation, if any. */
  deleteSelectedAnnotation(): void {
    const id = this.selectedAnnotationId();
    if (!id) return;
    this.dataService.removeAnnotation(id);
  }

  /**
   * Deletes the selected annotation on Backspace/Delete. Ignored while the user
   * is typing in a field (so editing the label text isn't hijacked) or when a
   * modifier is held. `preventDefault` also stops Backspace from navigating back.
   */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!this.selectedAnnotationId()) return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      return;
    }
    event.preventDefault();
    this.deleteSelectedAnnotation();
  }

  private readonly _dragId = signal<string | null>(null);
  /** Captured at drag-start: pointer origin AND the annotation's original position. Lets us move by relative delta instead of snapping the circle's centre under the pointer. */
  private readonly _dragStart = signal<{
    pointerX: number;
    pointerY: number;
    annXPercent: number;
    annYPercent: number;
  } | null>(null);
  /** Pointerdown on an *unselected* marker records intent here; pointerup commits the select. No drag fires until the marker is already selected. */
  private readonly _pendingSelectId = signal<string | null>(null);
  /** True while an annotation drag is in progress. */
  readonly isDragging = computed(() => this._dragId() !== null);

  /** Pending RAF id while a drag-move is queued — coalesces high-frequency pointermove events to one update per frame. */
  private _moveRaf: number | null = null;
  /** Latest pointer position pending commit on the next animation frame. */
  private _pendingMove: { clientX: number; clientY: number } | null = null;

  // ── Pan / pinch gesture state ──────────────────────────────────────────────
  /** Active non-marker pointers on the layer, keyed by `pointerId`. Size 1 → pan, size ≥ 2 → pinch. */
  private readonly _pointers = new Map<number, { x: number; y: number }>();
  /** Pan origin: pointer position + view captured at grab time. Null when not panning. */
  private _panStart: { pointerX: number; pointerY: number; view: ViewState } | null = null;
  /** True once a pan/pinch has moved beyond the click threshold — suppresses deselect-on-release. */
  private _gestureMoved = false;
  /** Pinch anchor: start finger spread/midpoint, the view, and the invariant (untransformed) layer box. */
  private _pinchStart: {
    dist: number;
    midX: number;
    midY: number;
    view: ViewState;
    originLeft: number;
    originTop: number;
    baseWidth: number;
    baseHeight: number;
  } | null = null;

  private readonly base = viewChild.required<BaseCardPreviewComponent>('base');
  private readonly uploadPanel = viewChild.required<StellarUploadPanelComponent>('upload');
  private readonly annotationsLayerRef = viewChild.required<ElementRef>('annotationsLayer');

  /** Triggers the underlying export pipeline. */
  exportCard(): void {
    this.base().exportCard();
  }

  /** Number of currently-visible annotations (drives the toolbar pill). */
  readonly visibleCount = computed(() => this.visibleAnnotations().length);

  /** Resets the map document via the upload panel (single source of truth). */
  clearAll(): void {
    this.uploadPanel().resetMap();
  }

  /** Deselect everything. */
  deselectAll(): void {
    this.dataService.selectAnnotation(null);
  }

  /**
   * Begins an annotation interaction once a press has been resolved to a
   * specific annotation. Two-stroke:
   * - already selected → start a delta-based drag (capturing the pointer origin
   *   and the annotation's current position, so we move by a delta — no snap).
   * - not selected → record pending-select intent only; pointerup commits it.
   *   No drag fires until the annotation is already selected.
   */
  pressAnnotation(ann: ImageAnnotation, event: PointerEvent): void {
    if (this.dataService.selectedAnnotationId() === ann.id) {
      this._dragId.set(ann.id);
      this._dragStart.set({
        pointerX: event.clientX,
        pointerY: event.clientY,
        annXPercent: ann.xPercent,
        annYPercent: ann.yPercent,
      });
    } else {
      this._pendingSelectId.set(ann.id);
    }
  }

  /**
   * Single pointerdown handler for the whole map. Selection is driven by the
   * annotation's RING (`findHitAnnotationId`) or its LABEL — never the filled
   * centre — so a small circle nested inside a bigger one stays selectable
   * (clicking the big circle's interior no longer always grabs the outer one).
   * The already-selected annotation can be grabbed anywhere on its body for a
   * forgiving drag. A press that lands on no annotation pans / pinches the map.
   *
   * Pointer events unify mouse + touch; the pointer is captured on the layer so
   * subsequent move/up events keep firing even if the finger drifts away.
   */
  onLayerPointerdown(event: PointerEvent): void {
    const targetEl = event.target as HTMLElement | null;
    const layer = this.annotationsLayerRef().nativeElement as HTMLElement;
    const selectedId = this.dataService.selectedAnnotationId();

    // Label click selects its annotation; otherwise hit-test the ring.
    const labelMarker = targetEl?.closest?.('.annotation-label')
      ? (targetEl.closest('.annotation-marker') as HTMLElement | null)
      : null;
    let hitId: string | null =
      labelMarker?.dataset?.['annotationId'] ?? findHitAnnotationId(event, 10);

    // The selected annotation can be grabbed anywhere on its body to drag it.
    if (!hitId && selectedId) {
      const markerEl = targetEl?.closest?.('.annotation-marker') as HTMLElement | null;
      if (markerEl?.dataset?.['annotationId'] === selectedId) {
        hitId = selectedId;
      }
    }

    if (hitId) {
      event.preventDefault();
      layer.setPointerCapture?.(event.pointerId);
      const ann = this.mapData().annotations.find((a) => a.id === hitId);
      if (ann) {
        this.pressAnnotation(ann, event);
      }
      return;
    }

    // No annotation under the press → pan / pinch the empty background. A press
    // is always tracked so a second finger can upgrade the gesture to pinch.
    layer.setPointerCapture?.(event.pointerId);
    this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this._pointers.size >= 2) {
      this._beginPinch();
      this._panStart = null;
      return;
    }
    if (this.view().zoom > 1) {
      this._panStart = { pointerX: event.clientX, pointerY: event.clientY, view: this.view() };
      this._gestureMoved = false;
    }
  }

  /**
   * Repositions the active annotation while dragging, or pans/pinches the
   * view. Pointermove can fire at 120+ Hz; each signal write triggers a full
   * CD pass over every marker + computeds, which is too expensive to do per
   * event. We coalesce to one update per animation frame via RAF.
   */
  onLayerPointermove(event: PointerEvent): void {
    if (this._pointers.has(event.pointerId)) {
      this._pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (!this._dragId() && !this._panStart && !this._pinchStart) {
      return;
    }
    this._pendingMove = { clientX: event.clientX, clientY: event.clientY };
    if (this._moveRaf !== null) {
      return;
    }
    this._moveRaf = requestAnimationFrame(() => {
      this._moveRaf = null;
      if (this._dragId()) {
        this._applyMarkerDrag();
      } else if (this._pinchStart) {
        this._applyPinch();
      } else if (this._panStart) {
        this._applyPan();
      }
    });
  }

  /** Commits the queued marker-drag move (delta from the drag origin, no snap-to-pointer). */
  private _applyMarkerDrag(): void {
    const dragId = this._dragId();
    const pending = this._pendingMove;
    const start = this._dragStart();
    this._pendingMove = null;
    if (!dragId || !pending || !start) {
      return;
    }
    const rect = this.annotationsLayerRef().nativeElement.getBoundingClientRect();
    const dxPct = ((pending.clientX - start.pointerX) / rect.width) * 100;
    const dyPct = ((pending.clientY - start.pointerY) / rect.height) * 100;
    this.dataService.updateAnnotationPosition(
      dragId,
      start.annXPercent + dxPct,
      start.annYPercent + dyPct,
    );
  }

  /** Commits the queued pan move (absolute offset from the grab origin). */
  private _applyPan(): void {
    const start = this._panStart;
    const pending = this._pendingMove;
    this._pendingMove = null;
    if (!start || !pending) {
      return;
    }
    const dx = pending.clientX - start.pointerX;
    const dy = pending.clientY - start.pointerY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this._gestureMoved = true;
    }
    const rect = this.annotationsLayerRef().nativeElement.getBoundingClientRect();
    this.view.set(panByScreenDelta(start.view, dx, dy, rect.width, rect.height));
  }

  /** Commits a pinch update: scale by the finger-spread ratio about the start midpoint, then follow the midpoint translation. */
  private _applyPinch(): void {
    const start = this._pinchStart;
    this._pendingMove = null;
    if (!start) {
      return;
    }
    const pts = [...this._pointers.values()];
    if (pts.length < 2) {
      return;
    }
    const [a, b] = pts;
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || start.dist;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const nextZoom = clampZoom((start.view.zoom * dist) / start.dist);
    // Content fraction under the start midpoint, using the captured invariant
    // box so the anchor stays stable across frames.
    const u =
      (start.midX - start.originLeft - (start.view.panXPct / 100) * start.baseWidth) /
      (start.view.zoom * start.baseWidth);
    const v =
      (start.midY - start.originTop - (start.view.panYPct / 100) * start.baseHeight) /
      (start.view.zoom * start.baseHeight);
    const zoomed = zoomAtPoint(start.view, u, v, nextZoom);
    this.view.set(
      panByScreenDelta(
        zoomed,
        midX - start.midX,
        midY - start.midY,
        start.baseWidth * zoomed.zoom,
        start.baseHeight * zoomed.zoom,
      ),
    );
  }

  /** Captures the pinch anchor (finger spread/midpoint + invariant layer box) when a second finger lands. */
  private _beginPinch(): void {
    const pts = [...this._pointers.values()];
    if (pts.length < 2) {
      return;
    }
    const [a, b] = pts;
    const rect = this.annotationsLayerRef().nativeElement.getBoundingClientRect();
    const view = this.view();
    const baseWidth = rect.width / view.zoom;
    const baseHeight = rect.height / view.zoom;
    this._pinchStart = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
      view,
      originLeft: rect.left - (view.panXPct / 100) * baseWidth,
      originTop: rect.top - (view.panYPct / 100) * baseHeight,
      baseWidth,
      baseHeight,
    };
    this._gestureMoved = true; // a pinch is never a click
  }

  /** Ends a drag / pan / pinch and resolves selection. */
  onLayerPointerup(event: PointerEvent): void {
    // Drop any RAF-queued move so the final position from this event
    // (handled below) isn't overwritten by a stale pending update.
    if (this._moveRaf !== null) {
      cancelAnimationFrame(this._moveRaf);
      this._moveRaf = null;
      this._pendingMove = null;
    }
    const dragId = this._dragId();
    if (dragId) {
      // Drag end. If the pointer barely moved, treat as a toggle-deselect
      // (clicking a selected marker again clears the selection).
      const start = this._dragStart();
      if (start) {
        const dx = event.clientX - start.pointerX;
        const dy = event.clientY - start.pointerY;
        if (Math.sqrt(dx * dx + dy * dy) < 3) {
          this.dataService.selectAnnotation(null);
        }
        // else: drag was committed via the move handler; leave selection as-is.
      }
      this._dragId.set(null);
      this._dragStart.set(null);
      return;
    }

    // Pan / pinch release. A tracked pointer means this press began on the
    // empty background; resolve the gesture before falling back to selection.
    if (this._pointers.has(event.pointerId)) {
      const wasGesture = this._panStart !== null || this._pinchStart !== null;
      this._pointers.delete(event.pointerId);

      if (this._pinchStart && this._pointers.size < 2) {
        // Dropped below two fingers — end the pinch. If one finger remains and
        // we're still zoomed, hand off to a fresh pan so it doesn't jump.
        this._pinchStart = null;
        const remaining = [...this._pointers.values()][0];
        if (remaining && this.view().zoom > 1) {
          this._panStart = { pointerX: remaining.x, pointerY: remaining.y, view: this.view() };
          this._gestureMoved = true;
        }
      } else if (this._panStart && this._pointers.size === 0) {
        const moved = this._gestureMoved;
        this._panStart = null;
        // A no-movement empty-area tap still clears the current selection.
        if (!moved) {
          this.dataService.selectAnnotation(null);
        }
      }

      if (wasGesture) {
        return;
      }
    }

    const pendingId = this._pendingSelectId();
    if (pendingId) {
      this._pendingSelectId.set(null);
      this.dataService.selectAnnotation(pendingId);
      return;
    }
    // Empty area click → deselect.
    const target = event.target as HTMLElement | null;
    if (!target?.closest?.('.annotation-marker')) {
      this.dataService.selectAnnotation(null);
    }
  }

  /** Cancels an in-progress drag / pan / pinch (e.g. system gesture takeover). */
  onLayerPointercancel(event: PointerEvent): void {
    if (this._moveRaf !== null) {
      cancelAnimationFrame(this._moveRaf);
      this._moveRaf = null;
      this._pendingMove = null;
    }
    this._pointers.delete(event.pointerId);
    if (this._pointers.size < 2) {
      this._pinchStart = null;
    }
    if (this._pointers.size === 0) {
      this._panStart = null;
    }
    this._dragId.set(null);
    this._dragStart.set(null);
    this._pendingSelectId.set(null);
  }

  /** Adds a new custom annotation at the centre of the canvas. */
  addCenterAnnotation(): void {
    const d = this.mapData();
    const radiusDb =
      d.naturalWidth && d.naturalHeight
        ? Math.round(Math.min(d.naturalWidth, d.naturalHeight) * 0.125)
        : 80;
    const ann: ImageAnnotation = {
      id: 'custom-' + Date.now(),
      xPercent: 50,
      yPercent: 50,
      radiusDb,
      label: 'Custom',
      visible: true,
      source: 'custom',
    };
    this.dataService.addAnnotation(ann);
  }

  /** Direct selection bypassing the ring hit-test (used by label clicks). */
  directSelect(id: string, event: MouseEvent): void {
    event.stopPropagation();
    const current = this.dataService.selectedAnnotationId();
    this.dataService.selectAnnotation(current === id ? null : id);
  }

  // TODO(stellar-annotation-color-mix): the `66` / `4d` alpha-hex suffixes
  // below assume the bound colour is a 6-character hex string. The cleaner
  // approach is `color-mix(in srgb, <color> 40%, transparent)`, but that
  // requires the colour to come in as a CSS token rather than a hex
  // literal — pre-existing pattern carried into this PR untouched.
  markerStyle(ann: ImageAnnotation): Record<string, string> {
    const g = this.mapData().globalAnnotationSettings;
    const s = ann.style ?? {};
    const color = s.color ?? g.color;
    const thickness = s.thickness ?? g.thickness;
    const opacity = s.opacity ?? g.circleOpacity;
    const radius = (s.radiusOverride ?? ann.radiusDb) * 2;
    return {
      width: radius + 'px',
      height: radius + 'px',
      'border-width': thickness + 'px',
      'border-color': color,
      'box-shadow': `0 0 ${thickness * 4}px ${color}66`,
      opacity: String(opacity),
    };
  }

  labelStyle(ann: ImageAnnotation): Record<string, string> {
    const g = this.mapData().globalAnnotationSettings;
    const s = ann.style ?? {};
    const color = s.labelColor ?? g.labelColor;
    const opacity = s.labelOpacity ?? g.labelOpacity;
    return {
      color,
      opacity: String(opacity),
      'font-size': (s.fontSize ?? g.fontSize) + 'rem',
      'font-family': g.fontFamily,
      border: `1px solid ${color}4d`,
    };
  }

  effectiveLabel(ann: ImageAnnotation): string {
    return ann.style?.customLabel || ann.label;
  }

  effectiveShowLabel(ann: ImageAnnotation): boolean {
    return ann.style?.showLabel ?? this.mapData().globalAnnotationSettings.showLabels ?? true;
  }

  effectiveShowMagnitude(ann: ImageAnnotation): boolean {
    const override = ann.style?.showMagnitude;
    if (override !== undefined) {
      return override;
    }
    return this.mapData().globalAnnotationSettings.showMagnitude ?? false;
  }

  /** Effective per-annotation distance visibility (override → global). */
  effectiveShowDistance(ann: ImageAnnotation): boolean {
    const override = ann.style?.showDistance;
    if (override !== undefined) {
      return override;
    }
    return this.mapData().globalAnnotationSettings.showDistance ?? false;
  }

  /** Compact light-year label for an annotation's distance (empty when unknown). */
  formatDistance(distanceLy: number | undefined): string {
    return formatLightYears(distanceLy);
  }

  getLabelPosition(xPercent: number, yPercent: number): string {
    if (yPercent > 90) {
      return 'label-top';
    }
    if (xPercent < 10) {
      return 'label-right';
    }
    if (xPercent > 90) {
      return 'label-left';
    }
    return '';
  }

  // ── Type lookup sets (OpenNGC codes + SIMBAD OTYPEs, all uppercase) ────────
  private static readonly STAR_TYPES = new Set([
    'STAR', '*', '**', '*ASS',
    'V*', 'CE*', 'RR*', 'LP*', 'MI*', 'SR*', 'NO*', 'SN*', 'WR*', 'C*',
    'BE*', 'HB*', 'WD*', 'N*', 'TT*', 'AE*', 'HS*', 'S*', 'SG*', 'S*R',
    'S*B', 'S*Y', 'EM*', 'OR*',
  ]);
  private static readonly GALAXY_TYPES = new Set([
    'G', 'GPAIR', 'GTRPL', 'GGROUP',
    'GX', 'GIP', 'GIG', 'GIC', 'BCLG', 'SY*', 'SY1', 'SY2', 'LINER', 'EMG',
  ]);
  private static readonly OPEN_CLUSTER_TYPES = new Set([
    'OCL', 'CL+N', 'OPC', 'CL*', 'AS*', 'OAS',
  ]);
  private static readonly GLOB_CLUSTER_TYPES = new Set(['GCL', 'GLC']);
  private static readonly NEBULA_TYPES = new Set([
    'HII', 'EMN', 'NEB', 'RFN', 'DARKNEB', 'SNR', 'NOVA',
    'RNE', 'MOC', 'DNE', 'EMO', 'BUB', 'HH',
  ]);
  private static readonly GALAXY_CLUSTER_TYPES = new Set(['GCLUS', 'CLG']);
  private static readonly QUASAR_TYPES = new Set(['QSO', 'BLA', 'AGN']);

  readonly visibleAnnotations = computed(() => {
    const f = this.mapData().filters;
    const T = StellarMapPreviewComponent;

    return this.mapData().annotations.filter((ann) => {
      if (ann.source === 'custom') {
        return ann.visible;
      }

      // Declutter gate (additive): when "Named objects only" is on, drop any
      // catalog/survey object that lacks a human-recognisable designation. The
      // remaining catalog/type/magnitude filters below still apply on top.
      if (f.onlyNamed && !isNamedAnnotation(ann)) {
        return false;
      }

      const type = (ann.type ?? '').toUpperCase();
      const catalog = (ann.catalog ?? '').toUpperCase();
      const name = (ann.name ?? '').toUpperCase();
      const label = (ann.label ?? '').toUpperCase();
      const mag = ann.magnitude ?? Infinity;

      if (T.STAR_TYPES.has(type)) {
        const isHD = catalog === 'HD' || name.startsWith('HD ') || label.startsWith('HD ');
        const namedMatch =
          f.showNamedStars && !!ann.commonName && !isHD && mag <= f.maxStarMagnitude;
        const hdMatch = f.showHDStars && isHD && mag <= f.maxStarMagnitude;
        // Anonymous survey stars (e.g. Gaia): a star that is neither named nor
        // HD-catalogued. Without this branch they were filtered out entirely,
        // so the magnitude slider appeared to do nothing for deep fields.
        const isFieldStar = !isHD && !ann.commonName;
        const fieldMatch = f.showFieldStars && isFieldStar && mag <= f.maxStarMagnitude;
        return namedMatch || hdMatch || fieldMatch;
      }

      let show = false;

      if (catalog === 'M' || type === 'M') show ||= f.showMessier;
      if (catalog === 'C' || type === 'C') show ||= f.showCaldwell;
      if (catalog === 'SH2') show ||= f.showSharpless;
      if (catalog === 'ACO') show ||= f.showAbellClusters;
      if (name.startsWith('NGC') || (catalog === 'NGC/IC' && name.startsWith('NGC')))
        show ||= f.showNGC;
      if (name.startsWith('IC') || (catalog === 'NGC/IC' && name.startsWith('IC')))
        show ||= f.showIC;
      if (!name.startsWith('NGC') && label.startsWith('NGC')) show ||= f.showNGC;
      if (!name.startsWith('IC') && label.startsWith('IC')) show ||= f.showIC;

      if (T.GALAXY_TYPES.has(type)) show ||= f.showGalaxies;
      if (T.OPEN_CLUSTER_TYPES.has(type)) show ||= f.showOpenClusters;
      if (T.GLOB_CLUSTER_TYPES.has(type)) show ||= f.showGlobularClusters;
      if (type === 'PN') show ||= f.showPlanetaryNebulae;
      if (T.NEBULA_TYPES.has(type)) show ||= f.showNebulae;
      if (T.GALAXY_CLUSTER_TYPES.has(type)) show ||= f.showAbellClusters;
      if (T.QUASAR_TYPES.has(type)) show ||= f.showQuasars;

      if (!show) {
        if (catalog === 'NGC/IC' || name.startsWith('NGC') || label.startsWith('NGC'))
          show = f.showNGC;
        else if (name.startsWith('IC') || label.startsWith('IC')) show = f.showIC;
        else if (catalog === 'M' || name.startsWith('M ') || label.startsWith('M '))
          show = f.showMessier;
        else if (catalog === 'C' || name.startsWith('C ') || label.startsWith('C '))
          show = f.showCaldwell;
        else if (catalog === 'SH2') show = f.showSharpless;
        else if (catalog === 'ACO') show = f.showAbellClusters;
        else if (catalog === 'HD' || name.startsWith('HD '))
          show = f.showHDStars && mag <= f.maxStarMagnitude;
      }

      return show;
    });
  });
}
