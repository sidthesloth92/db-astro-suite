import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
function makePointer(type: 'pointerdown' | 'pointerup', clientX: number, clientY: number): PointerEvent {
  const ev = new MouseEvent(type, { clientX, clientY, bubbles: true });
  Object.defineProperty(ev, 'pointerId', { value: 1, configurable: true });
  // Component reads `event.target.setPointerCapture?.()`. Stub it so it no-ops in the test environment
  // (a detached element throws InvalidStateError when called with a non-active pointer id).
  const fakeTarget = document.createElement('div');
  fakeTarget.setPointerCapture = () => undefined;
  Object.defineProperty(ev, 'target', { value: fakeTarget, configurable: true });
  return ev as PointerEvent;
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

  function mountComponent() {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
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

    component.onMarkerPointerdown(ann, makePointer('pointerdown', 100, 100));

    expect(component.isDragging()).toBeFalse();
    expect(mockDataService.selectAnnotation).not.toHaveBeenCalled();
  });

  it('should commit the pending selection on pointerup after pointerdown on an unselected marker', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-pending');

    component.onMarkerPointerdown(ann, makePointer('pointerdown', 100, 100));
    component.onLayerPointerup(makePointer('pointerup', 101, 100));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith('m-pending');
    expect(component.isDragging()).toBeFalse();
  });

  it('should start a drag when pointerdown lands on an already-selected marker', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-selected');
    mockDataService.selectedAnnotationId.set('m-selected');

    component.onMarkerPointerdown(ann, makePointer('pointerdown', 100, 100));

    expect(component.isDragging()).toBeTrue();
  });

  it('should deselect when a drag ends with delta < 3 (treat as toggle-off click)', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-toggle');
    mockDataService.selectedAnnotationId.set('m-toggle');

    component.onMarkerPointerdown(ann, makePointer('pointerdown', 100, 100));
    expect(component.isDragging()).toBeTrue();

    component.onLayerPointerup(makePointer('pointerup', 101, 100));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith(null);
    expect(component.isDragging()).toBeFalse();
  });

  it('should keep selection intact when a drag ends with delta >= 3', () => {
    const component = mountComponent();
    const ann = makeAnnotation('m-drag');
    mockDataService.selectedAnnotationId.set('m-drag');

    component.onMarkerPointerdown(ann, makePointer('pointerdown', 100, 100));
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
});
