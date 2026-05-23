import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import type { StellarMapData } from '../../models/card-data.model';
import { DEFAULT_GLOBAL_ANNOTATION_SETTINGS } from '../../models/annotation-settings.models';
import { AstrosolveService } from '../../services/astrosolve.service';
import { CardDataService } from '../../services/card-data.service';
import { WcsService } from '../../services/wcs.service';
import { StellarUploadPanelComponent } from './stellar-upload-panel.component';

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

const emptyMap: StellarMapData = {
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

describe('StellarUploadPanelComponent', () => {
  let dataStub: {
    stellarMapData: ReturnType<typeof signal<StellarMapData>>;
  };
  let solveStub: {
    loadLimits: jasmine.Spy;
    formatLimitsHint: jasmine.Spy;
    hasAccessKey: jasmine.Spy;
    validateForUpload: jasmine.Spy;
    saveAccessKey: jasmine.Spy;
    clearAccessKey: jasmine.Spy;
    solveImage: jasmine.Spy;
  };

  beforeEach(async () => {
    dataStub = {
      stellarMapData: signal<StellarMapData>({ ...emptyMap }),
    };
    solveStub = {
      loadLimits: jasmine.createSpy('loadLimits').and.resolveTo({}),
      formatLimitsHint: jasmine.createSpy('formatLimitsHint').and.returnValue('JPG/PNG · max 10 MB'),
      hasAccessKey: jasmine.createSpy('hasAccessKey').and.returnValue(true),
      validateForUpload: jasmine.createSpy('validateForUpload'),
      saveAccessKey: jasmine.createSpy('saveAccessKey'),
      clearAccessKey: jasmine.createSpy('clearAccessKey'),
      solveImage: jasmine.createSpy('solveImage'),
    };

    await TestBed.configureTestingModule({
      imports: [StellarUploadPanelComponent],
      providers: [
        { provide: CardDataService, useValue: dataStub },
        { provide: AstrosolveService, useValue: solveStub },
        { provide: WcsService, useValue: {} },
        { provide: AnalyticsService, useValue: makeAnalyticsStub() },
      ],
    }).compileComponents();
  });

  it('renders the upload card when no image is loaded', () => {
    const fixture = TestBed.createComponent(StellarUploadPanelComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.upload-card') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Upload Target');
  });

  it('shows the solve bar when an image is uploaded but no annotations exist', () => {
    dataStub.stellarMapData.update((d) => ({ ...d, backgroundImage: 'data:img' }));
    const fixture = TestBed.createComponent(StellarUploadPanelComponent);
    fixture.detectChanges();
    const solveBtn = fixture.nativeElement.querySelector('.solve-btn') as HTMLElement;
    expect(solveBtn).toBeTruthy();
  });

  it('surfaces a UI hint when loadLimits rejects', async () => {
    solveStub.loadLimits.and.rejectWith(new Error('network'));
    const fixture = TestBed.createComponent(StellarUploadPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadLimitsError()).toContain('Could not load');
  });

  it('resets the map document on resetMap()', () => {
    dataStub.stellarMapData.update((d) => ({
      ...d,
      backgroundImage: 'data:img',
      annotations: [
        { id: 'x', xPercent: 0, yPercent: 0, radiusDb: 10, label: 'X', visible: true, source: 'custom' },
      ],
    }));
    const fixture = TestBed.createComponent(StellarUploadPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.resetMap();
    expect(dataStub.stellarMapData().backgroundImage).toBeNull();
    expect(dataStub.stellarMapData().annotations.length).toBe(0);
  });
});
