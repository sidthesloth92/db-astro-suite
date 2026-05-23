import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { DEFAULT_GLOBAL_ANNOTATION_SETTINGS } from '../../models/annotation-settings.models';
import { ImageAnnotation } from '../../models/annotation.models';
import { StellarMapData } from '../../models/card-data';
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

describe('StellarMapPreviewComponent drag state machine', () => {
  let mockDataService: {
    stellarMapData: ReturnType<typeof signal<StellarMapData>>;
    selectedAnnotationId: ReturnType<typeof signal<string | null>>;
    selectAnnotation: jasmine.Spy;
    updateAnnotationPosition: jasmine.Spy;
    addAnnotation: jasmine.Spy;
  };

  beforeEach(async () => {
    mockDataService = {
      stellarMapData: signal<StellarMapData>({ ...MINIMAL_MAP_DATA }),
      selectedAnnotationId: signal<string | null>(null),
      selectAnnotation: jasmine.createSpy('selectAnnotation'),
      updateAnnotationPosition: jasmine.createSpy('updateAnnotationPosition'),
      addAnnotation: jasmine.createSpy('addAnnotation'),
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

  it('should start drag on mousedown regardless of prior selection state', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const ann = makeAnnotation('test-select');
    const mouseEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(ann, mouseEvent);

    expect(component.isDragging()).toBeTrue();
    expect(mockDataService.selectAnnotation).not.toHaveBeenCalled();
  });

  it('should select annotation on mouseup when delta < 3 and annotation was unselected', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const ann = makeAnnotation('test-click-select');
    component.onMarkerMousedown(ann, new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    component.onLayerMouseup(new MouseEvent('mouseup', { clientX: 101, clientY: 100 }));

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith('test-click-select');
    expect(component.isDragging()).toBeFalse();
  });

  it('should set isDragging to true after onMarkerMousedown', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const mouseEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(makeAnnotation('test-1'), mouseEvent);

    expect(component.isDragging()).toBeTrue();
  });

  it('should set isDragging to false after onLayerMouseup when delta < 3 (treated as click)', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(makeAnnotation('test-2'), downEvent);
    expect(component.isDragging()).toBeTrue();

    const upEvent = new MouseEvent('mouseup', { clientX: 101, clientY: 100 });
    component.onLayerMouseup(upEvent);

    expect(component.isDragging()).toBeFalse();
  });

  it('should set isDragging to false after onLayerMouseup when delta >= 3 (drag ended)', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(makeAnnotation('test-3'), downEvent);
    expect(component.isDragging()).toBeTrue();

    const upEvent = new MouseEvent('mouseup', { clientX: 110, clientY: 110 });
    component.onLayerMouseup(upEvent);

    expect(component.isDragging()).toBeFalse();
  });

  it('should call selectAnnotation(null) on background mouseup when not dragging', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const upEvent = new MouseEvent('mouseup', { clientX: 50, clientY: 50 });
    component.onLayerMouseup(upEvent);

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith(null);
  });
});
