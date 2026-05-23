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

  it('renders the selected annotation when one is selected', () => {
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
    const title = fixture.nativeElement.querySelector('.title') as HTMLElement;
    expect(title?.textContent).toContain('NGC 1234');
  });

  it('removes the selected annotation on trash click', () => {
    const ann: ImageAnnotation = {
      id: 'a',
      xPercent: 50,
      yPercent: 50,
      radiusDb: 40,
      label: 'Tmp',
      visible: true,
      source: 'custom',
    };
    svc.addAnnotation(ann);
    const fixture = TestBed.createComponent(AnnotationSelectedPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.removeAnnotation();
    expect(svc.stellarMapData().annotations.length).toBe(0);
  });
});
