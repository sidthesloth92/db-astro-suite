import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_GLOBAL_ANNOTATION_SETTINGS } from '../../models/annotation-settings.models';
import { ImageAnnotation } from '../../models/annotation.models';
import { StellarMapData } from '../../models/card-data';
import { CardDataService } from '../../services/card-data.service';
import { StellarMapPreviewComponent } from './stellar-map-preview';

/** Minimal stub so viewChild.required('controls') resolves during tests. */
@Component({
  selector: 'dba-ag-annotation-controls',
  template: '',
  exportAs: 'dbaAnnotationControls',
  standalone: true,
})
class AnnotationControlsStub {
  resetMap = jasmine.createSpy('resetMap');
  fileInput = { nativeElement: { click: jasmine.createSpy('click') } };
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
      providers: [{ provide: CardDataService, useValue: mockDataService }],
    })
      .overrideComponent(StellarMapPreviewComponent, {
        set: {
          imports: [AnnotationControlsStub],
          template:
            '<div #annotationsLayer></div>' +
            '<dba-ag-annotation-controls #controls="dbaAnnotationControls"></dba-ag-annotation-controls>',
        },
      })
      .compileComponents();
  });

  it('should select annotation without starting drag on first click of unselected annotation', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // selectedAnnotationId is null — first click selects, does not start drag
    const ann = makeAnnotation('test-select');
    const mouseEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(ann, mouseEvent);

    expect(mockDataService.selectAnnotation).toHaveBeenCalledWith('test-select');
    expect(component.isDragging()).toBeFalse();
  });

  it('should set isDragging to true after onMarkerMousedown on an already-selected annotation', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Pre-select the annotation — only a second mousedown on the selected annotation starts a drag
    mockDataService.selectedAnnotationId.set('test-1');

    const mouseEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(makeAnnotation('test-1'), mouseEvent);

    expect(component.isDragging()).toBeTrue();
  });

  it('should set isDragging to false after onLayerMouseup when delta < 3 (treated as click)', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Pre-select so drag starts on mousedown
    mockDataService.selectedAnnotationId.set('test-2');

    const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(makeAnnotation('test-2'), downEvent);
    expect(component.isDragging()).toBeTrue();

    // delta of ~1px — below the 3px click threshold
    const upEvent = new MouseEvent('mouseup', { clientX: 101, clientY: 100 });
    component.onLayerMouseup(upEvent);

    expect(component.isDragging()).toBeFalse();
  });

  it('should set isDragging to false after onLayerMouseup when delta >= 3 (drag ended)', () => {
    const fixture = TestBed.createComponent(StellarMapPreviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Pre-select so drag starts on mousedown
    mockDataService.selectedAnnotationId.set('test-3');

    const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    component.onMarkerMousedown(makeAnnotation('test-3'), downEvent);
    expect(component.isDragging()).toBeTrue();

    // delta of ~14px — above the 3px click threshold
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
