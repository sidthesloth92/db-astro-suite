import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DEFAULT_GLOBAL_ANNOTATION_SETTINGS } from '../../models/annotation-settings.models';
import { ImageAnnotation } from '../../models/annotation.models';
import { StellarMapData } from '../../models/card-data.model';
import { AstrosolveService } from '../../services/astrosolve.service';
import { CardDataService } from '../../services/card-data.service';
import { WcsService } from '../../services/wcs.service';
import { StellarMapPreviewComponent } from './stellar-map-preview';

/** Minimal stub for the upload panel so viewChild.required('upload') resolves. */
@Component({
  selector: 'dba-ag-stellar-upload-panel',
  template: '',
  standalone: true,
})
class StellarUploadPanelStub {
  resetMap = jasmine.createSpy('resetMap');
}

const MINIMAL_MAP_DATA: StellarMapData = {
  backgroundImage: null,
  rawFile: null,
  aspectRatio: 'auto',
  annotations: [],
  filters: {
    onlyNamed: false,
    showMessier: true,
    showNGC: true,
    showIC: true,
    showCaldwell: true,
    showSharpless: true,
    showAbellClusters: true,
    showGalaxies: true,
    showOpenClusters: true,
    showGlobularClusters: true,
    showPlanetaryNebulae: true,
    showNebulae: true,
    showQuasars: true,
    showNamedStars: true,
    showHDStars: true,
    showFieldStars: true,
    maxStarMagnitude: 7,
  },
  globalAnnotationSettings: { ...DEFAULT_GLOBAL_ANNOTATION_SETTINGS },
};

const makeAnnotation = (id: string): ImageAnnotation => ({
  id,
  xPercent: 50,
  yPercent: 50,
  radiusDb: 40,
  label: id,
  visible: true,
  source: 'custom',
});

function makeAnalyticsStub(): Record<string, jasmine.Spy> {
  return new Proxy({} as Record<string, jasmine.Spy>, {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = jasmine.createSpy(prop);
      }
      return target[prop];
    },
  });
}

/** PointerEvent stub — mouse event with pointer-id and a non-null target the component can call setPointerCapture on. */
function makePointer(
  type: 'pointerdown' | 'pointerup' | 'pointermove' | 'pointercancel',
  clientX: number,
  clientY: number,
  pointerId = 1,
): PointerEvent {
  const ev = new MouseEvent(type, { clientX, clientY, bubbles: true });
  Object.defineProperty(ev, 'pointerId', { value: pointerId, configurable: true });
  // Component reads `event.target.setPointerCapture?.()`. Stub it so it no-ops in the test environment
  // (a detached element throws InvalidStateError when called with a non-active pointer id).
  const fakeTarget = document.createElement('div');
  fakeTarget.setPointerCapture = () => undefined;
  Object.defineProperty(ev, 'target', { value: fakeTarget, configurable: true });
  return ev as PointerEvent;
}

/** A fixed, non-zero layer box for pan/pinch math (the detached test div reports 0×0). */
function stubLayerRect(layer: HTMLElement, width = 400, height = 400): void {
  layer.setPointerCapture = () => undefined;
  spyOn(layer, 'getBoundingClientRect').and.returnValue({
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

/** KeyboardEvent stub with a settable `target` for the document keydown handler. */
function makeKey(key: string, target: EventTarget = document.body): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true });
  Object.defineProperty(ev, 'target', { value: target, configurable: true });
  return ev;
}

describe('StellarMapPreviewComponent pointer state machine', () => {
  let mockDataService: {
    stellarMapData: ReturnType<typeof signal<StellarMapData>>;
    cardData: ReturnType<typeof signal<unknown>>;
    selectedAnnotationId: ReturnType<typeof signal<string | null>>;
    selectAnnotation: jasmine.Spy;
    updateAnnotationPosition: jasmine.Spy;
    addAnnotation: jasmine.Spy;
    removeAnnotation: jasmine.Spy;
  };

  let fixture: ComponentFixture<StellarMapPreviewComponent>;

  function mountComponent() {
    fixture = TestBed.createComponent(StellarMapPreviewComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** The overridden test template renders the annotations layer as the first div. */
  function layerEl(): HTMLElement {
    return fixture.nativeElement.querySelector('div') as HTMLElement;
  }

  /**
   * Captures queued requestAnimationFrame callbacks so the test can flush them
   * in real (deferred) order — the component clears its RAF handle inside the
   * callback, so running the callback before `requestAnimationFrame` returns
   * (i.e. fully synchronously) would wedge the coalescing guard.
   */
  function withRafQueue(fn: (flush: () => void) => void): void {
    let pending: FrameRequestCallback | null = null;
    const spy = spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      pending = cb;
      return 1;
    });
    const flush = (): void => {
      const cb = pending;
      pending = null;
      cb?.(0);
    };
    try {
      fn(flush);
    } finally {
      spy.and.callThrough();
    }
  }

  beforeEach(async () => {
    mockDataService = {
      stellarMapData: signal<StellarMapData>({ ...MINIMAL_MAP_DATA }),
      cardData: signal<unknown>({}),
      selectedAnnotationId: signal<string | null>(null),
      selectAnnotation: jasmine.createSpy('selectAnnotation').and.callFake((id: string | null) => {
        mockDataService.selectedAnnotationId.set(id);
      }),
      updateAnnotationPosition: jasmine.createSpy('updateAnnotationPosition'),
      addAnnotation: jasmine.createSpy('addAnnotation'),
      removeAnnotation: jasmine.createSpy('removeAnnotation'),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: CardDataService, useValue: mockDataService },
        { provide: AstrosolveService, useValue: {} },
        { provide: WcsService, useValue: {} },
        { provide: AnalyticsService, useValue: makeAnalyticsStub() },
      ],
    })
      .overrideComponent(StellarMapPreviewComponent, {
        set: {
          imports: [StellarUploadPanelStub],
          template:
            '<div #annotationsLayer></div>' +
            '<dba-ag-stellar-upload-panel #upload></dba-ag-stellar-upload-panel>',
        },
      })
      .compileComponents();
  });

  it('should not start a drag when pointerdown lands on an unselected marker', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-1');

    component.pressAnnotation(ann, makePointer('pointerdown', 100, 100));

    expect(component.isDragging()).toBeFalse();
    expect(mockDataService.selectAnnotation).not.toHaveBeenCalled();
  });

  it('should commit the pending selection on pointerup after pointerdown on an unselected marker', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-pending');

    component.pressAnnotation(ann, makePointer('pointerdown', 100, 100));
    component.onLayerPointerup(makePointer('pointerup', 101, 100));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith('m-pending');
    expect(component.isDragging()).toBeFalse();
  });

  it('should start a drag when pointerdown lands on an already-selected marker', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-selected');
    mockDataService.selectedAnnotationId.set('m-selected');

    component.pressAnnotation(ann, makePointer('pointerdown', 100, 100));

    expect(component.isDragging()).toBeTrue();
  });

  it('should deselect when a drag ends with delta < 3 (treat as toggle-off click)', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-toggle');
    mockDataService.selectedAnnotationId.set('m-toggle');

    component.pressAnnotation(ann, makePointer('pointerdown', 100, 100));
    expect(component.isDragging()).toBeTrue();

    component.onLayerPointerup(makePointer('pointerup', 101, 100));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith(null);
    expect(component.isDragging()).toBeFalse();
  });

  it('should keep selection intact when a drag ends with delta >= 3', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-drag');
    mockDataService.selectedAnnotationId.set('m-drag');

    component.pressAnnotation(ann, makePointer('pointerdown', 100, 100));
    component.onLayerPointerup(makePointer('pointerup', 130, 130));

    // selectAnnotation is the toggle-off path. With a real drag (delta >= 3),
    // the handler must leave selection alone.
    expect(mockDataService.selectAnnotation).not.toHaveBeenCalledWith(null);
    expect(component.isDragging()).toBeFalse();
  });

  it('should deselect when pointerup fires on empty background while nothing is being dragged', () => {
    const component = mountComponent();

    component.onLayerPointerup(makePointer('pointerup', 50, 50));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith(null);
  });

  /** A pointerdown whose `target` is the given element (overrides makePointer's stub). */
  function pressOn(target: HTMLElement): PointerEvent {
    const ev = makePointer('pointerdown', 10, 10);
    Object.defineProperty(ev, 'target', { value: target, configurable: true });
    return ev;
  }

  it('should select an annotation when its label is clicked', () => {
    const component = mountComponent();
    stubLayerRect(layerEl());
    mockDataService.stellarMapData.update((d) => ({
      ...d,
      annotations: [makeAnnotation('m-lbl')],
    }));

    const marker = document.createElement('div');
    marker.className = 'annotation-marker';
    marker.dataset['annotationId'] = 'm-lbl';
    const label = document.createElement('span');
    label.className = 'annotation-label';
    marker.appendChild(label);

    component.onLayerPointerdown(pressOn(label));
    component.onLayerPointerup(makePointer('pointerup', 10, 10));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith('m-lbl');
  });

  it('should grab the already-selected annotation anywhere on its body to drag', () => {
    const component = mountComponent();
    stubLayerRect(layerEl());
    mockDataService.stellarMapData.update((d) => ({
      ...d,
      annotations: [makeAnnotation('m-sel')],
    }));
    mockDataService.selectedAnnotationId.set('m-sel');

    const marker = document.createElement('div');
    marker.className = 'annotation-marker';
    marker.dataset['annotationId'] = 'm-sel';

    component.onLayerPointerdown(pressOn(marker));

    expect(component.isDragging()).toBeTrue();
  });

  describe('zoom and pan', () => {
    it('should start at fit with an identity transform', () => {
      const component = mountComponent();

      expect(component.isZoomed()).toBeFalse();
      expect(component.viewTransform()).toBe('translate(0%, 0%) scale(1)');
    });

    it('should zoom in about the centre on zoomIn()', () => {
      const component = mountComponent();

      component.zoomIn();

      expect(component.isZoomed()).toBeTrue();
      expect(component.viewTransform()).toContain('scale(1.4)');
    });

    it('should not zoom out past fit', () => {
      const component = mountComponent();

      component.zoomOut();

      expect(component.isZoomed()).toBeFalse();
      expect(component.viewTransform()).toBe('translate(0%, 0%) scale(1)');
    });

    it('should snap back to fit on resetView()', () => {
      const component = mountComponent();
      component.zoomIn();
      component.zoomIn();
      expect(component.isZoomed()).toBeTrue();

      component.resetView();

      expect(component.viewTransform()).toBe('translate(0%, 0%) scale(1)');
    });

    it('should reset the view when the background image changes', () => {
      const component = mountComponent();
      component.zoomIn();
      expect(component.isZoomed()).toBeTrue();

      mockDataService.stellarMapData.update((d) => ({
        ...d,
        backgroundImage: 'data:image/png;base64,AAAA',
      }));
      fixture.detectChanges();

      expect(component.isZoomed()).toBeFalse();
      expect(component.viewTransform()).toBe('translate(0%, 0%) scale(1)');
    });

    it('should pan the background when dragging an empty area while zoomed', () => {
      const component = mountComponent();
      const layer = layerEl();
      stubLayerRect(layer);

      withRafQueue((flush) => {
        component.zoomIn(); // zoom 1.4, pan -20% / -20% (centre anchor)
        component.onLayerPointerdown(makePointer('pointerdown', 200, 200));
        component.onLayerPointermove(makePointer('pointermove', 150, 200));
        flush();
      });

      // ΔpanX% = 100 * -50 * 1.4 / 400 = -17.5 → -20 + -17.5 = -37.5.
      expect(component.viewTransform()).toBe('translate(-37.5%, -20%) scale(1.4)');
    });

    it('should not pan when at fit (single-finger drag is inert)', () => {
      const component = mountComponent();
      const layer = layerEl();
      stubLayerRect(layer);

      withRafQueue((flush) => {
        component.onLayerPointerdown(makePointer('pointerdown', 200, 200));
        component.onLayerPointermove(makePointer('pointermove', 150, 200));
        flush();
      });

      expect(component.viewTransform()).toBe('translate(0%, 0%) scale(1)');
    });

    it('should zoom in on a two-finger pinch-apart gesture', () => {
      const component = mountComponent();
      const layer = layerEl();
      stubLayerRect(layer);

      withRafQueue((flush) => {
        // Two fingers 100px apart, centred at (200, 200).
        component.onLayerPointerdown(makePointer('pointerdown', 150, 200, 1));
        component.onLayerPointerdown(makePointer('pointerdown', 250, 200, 2));
        // Spread to 200px apart → 2× zoom (flush after each finger moves).
        component.onLayerPointermove(makePointer('pointermove', 100, 200, 1));
        flush();
        component.onLayerPointermove(makePointer('pointermove', 300, 200, 2));
        flush();
      });

      expect(component.viewTransform()).toContain('scale(2)');
    });
  });

  describe('keyboard delete', () => {
    it('should remove the selected annotation on Backspace', () => {
      const component = mountComponent();
      mockDataService.selectedAnnotationId.set('m-1');

      component.onDocumentKeydown(makeKey('Backspace'));

      expect(mockDataService.removeAnnotation).toHaveBeenCalledWith('m-1');
    });

    it('should remove the selected annotation on Delete', () => {
      const component = mountComponent();
      mockDataService.selectedAnnotationId.set('m-2');

      component.onDocumentKeydown(makeKey('Delete'));

      expect(mockDataService.removeAnnotation).toHaveBeenCalledWith('m-2');
    });

    it('should NOT delete while typing in a text input', () => {
      const component = mountComponent();
      mockDataService.selectedAnnotationId.set('m-3');

      component.onDocumentKeydown(makeKey('Backspace', document.createElement('input')));

      expect(mockDataService.removeAnnotation).not.toHaveBeenCalled();
    });

    it('should do nothing when no annotation is selected', () => {
      const component = mountComponent();

      component.onDocumentKeydown(makeKey('Backspace'));

      expect(mockDataService.removeAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('named-objects-only declutter filter', () => {
    const namedGalaxy: ImageAnnotation = {
      id: 'ngc',
      xPercent: 40,
      yPercent: 40,
      radiusDb: 40,
      label: 'NGC 3031',
      name: 'NGC 3031',
      visible: true,
      source: 'local',
      type: 'G',
      catalog: 'NGC/IC',
      magnitude: 7,
    };
    const fieldStar: ImageAnnotation = {
      id: 'gaia',
      xPercent: 60,
      yPercent: 60,
      radiusDb: 8,
      label: 'Gaia DR3 1',
      name: 'Gaia DR3 1',
      visible: true,
      source: 'local',
      type: 'Star',
      magnitude: 5,
    };

    function seed(onlyNamed: boolean): void {
      mockDataService.stellarMapData.update((d) => ({
        ...d,
        filters: { ...d.filters, onlyNamed },
        annotations: [namedGalaxy, fieldStar, makeAnnotation('custom-1')],
      }));
    }

    it('shows both catalog objects and customs when the filter is off', () => {
      const component = mountComponent();
      seed(false);

      const ids = component.visibleAnnotations().map((a) => a.id);
      expect(ids).toContain('ngc');
      expect(ids).toContain('gaia');
      expect(ids).toContain('custom-1');
      expect(component.visibleCount()).toBe(3);
    });

    it('hides un-named survey sources but keeps named objects and customs when on', () => {
      const component = mountComponent();
      seed(true);

      const ids = component.visibleAnnotations().map((a) => a.id);
      expect(ids).toContain('ngc');
      expect(ids).toContain('custom-1');
      expect(ids).not.toContain('gaia');
      expect(component.visibleCount()).toBe(2);
    });
  });

  describe('star magnitude slider (named-only OFF)', () => {
    const star = (id: string, magnitude: number): ImageAnnotation => ({
      id,
      xPercent: 50,
      yPercent: 50,
      radiusDb: 8,
      label: id,
      name: `Gaia DR3 ${id}`,
      visible: true,
      source: 'local',
      type: 'Star',
      magnitude,
    });

    it('hides field stars fainter than the magnitude slider when the named filter is off', () => {
      const component = mountComponent();
      mockDataService.stellarMapData.update((d) => ({
        ...d,
        filters: { ...d.filters, onlyNamed: false, showFieldStars: true, maxStarMagnitude: 5 },
        annotations: [star('bright', 3), star('mid', 6), star('faint', 9)],
      }));

      const ids = component.visibleAnnotations().map((a) => a.id);
      expect(ids).toEqual(['bright']);
    });
  });

  describe('label & distance visibility', () => {
    const ann: ImageAnnotation = {
      id: 'a1',
      xPercent: 50,
      yPercent: 50,
      radiusDb: 10,
      label: 'M 13',
      name: 'M 13',
      visible: true,
      source: 'local',
      distanceLy: 24135,
    };

    function setGlobal(patch: Partial<StellarMapData['globalAnnotationSettings']>): void {
      mockDataService.stellarMapData.update((d) => ({
        ...d,
        globalAnnotationSettings: { ...d.globalAnnotationSettings, ...patch },
        annotations: [ann],
      }));
    }

    it('hides all labels when the global show-labels toggle is off', () => {
      const component = mountComponent();
      setGlobal({ showLabels: false });
      expect(component.effectiveShowLabel(ann)).toBeFalse();
    });

    it('lets a per-annotation override force a label on while global is off', () => {
      const component = mountComponent();
      setGlobal({ showLabels: false });
      expect(component.effectiveShowLabel({ ...ann, style: { showLabel: true } })).toBeTrue();
    });

    it('shows distance only when the global (or per-annotation) toggle is on', () => {
      const component = mountComponent();
      setGlobal({ showDistance: false });
      expect(component.effectiveShowDistance(ann)).toBeFalse();
      setGlobal({ showDistance: true });
      expect(component.effectiveShowDistance(ann)).toBeTrue();
      expect(
        component.effectiveShowDistance({ ...ann, style: { showDistance: false } }),
      ).toBeFalse();
    });

    it('formats the distance as a compact light-year string', () => {
      const component = mountComponent();
      expect(component.formatDistance(ann.distanceLy)).toBe('24,100 ly');
      expect(component.formatDistance(undefined)).toBe('');
    });
  });
});
