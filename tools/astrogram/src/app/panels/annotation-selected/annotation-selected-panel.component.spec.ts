import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import type { ImageAnnotation } from '../../models/annotation.models';
import { AnnotationSelectedPanelComponent } from './annotation-selected-panel.component';

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

describe('AnnotationSelectedPanelComponent', () => {
  let svc: CardDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnotationSelectedPanelComponent],
      providers: [{ provide: AnalyticsService, useValue: makeAnalyticsStub() }],
    }).compileComponents();
    svc = TestBed.inject(CardDataService);
  });

  it('shows an empty state when no annotation is selected', () => {
    const fixture = TestBed.createComponent(AnnotationSelectedPanelComponent);
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.empty');
    expect(empty).toBeTruthy();
  });

  it('renders the selected annotation label in the Label input', () => {
    const ann: ImageAnnotation = {
      id: 'a',
      xPercent: 50,
      yPercent: 50,
      radiusDb: 40,
      label: 'NGC 1234',
      visible: true,
      source: 'custom',
    };
    svc.addAnnotation(ann);
    const fixture = TestBed.createComponent(AnnotationSelectedPanelComponent);
    fixture.detectChanges();
    const labelInput = fixture.nativeElement.querySelector('.label-input') as HTMLInputElement;
    expect(labelInput?.value).toBe('NGC 1234');
  });

  it('reverts every per-annotation override on revertOverrides()', () => {
    const ann: ImageAnnotation = {
      id: 'a',
      xPercent: 50,
      yPercent: 50,
      radiusDb: 40,
      label: 'Tmp',
      visible: true,
      source: 'custom',
      style: { color: '#ff0000', thickness: 4, customLabel: 'Custom' },
    };
    svc.addAnnotation(ann);
    const fixture = TestBed.createComponent(AnnotationSelectedPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.revertOverrides();
    const updated = svc.stellarMapData().annotations.find((a) => a.id === 'a');
    expect(updated?.style).toBeUndefined();
  });

  it('clears a single field on clearField()', () => {
    const ann: ImageAnnotation = {
      id: 'a',
      xPercent: 50,
      yPercent: 50,
      radiusDb: 40,
      label: 'Tmp',
      visible: true,
      source: 'custom',
      style: { color: '#ff0000', thickness: 4 },
    };
    svc.addAnnotation(ann);
    const fixture = TestBed.createComponent(AnnotationSelectedPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.clearField('color');
    const updated = svc.stellarMapData().annotations.find((a) => a.id === 'a');
    expect(updated?.style?.color).toBeUndefined();
    expect(updated?.style?.thickness).toBe(4);
  });
});
