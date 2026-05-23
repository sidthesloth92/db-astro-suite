import { TestBed } from '@angular/core/testing';
import { CardDataService } from '../../services/card-data.service';
import { AnnotationFiltersPanelComponent } from './annotation-filters-panel.component';

describe('AnnotationFiltersPanelComponent', () => {
  let svc: CardDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnotationFiltersPanelComponent],
    }).compileComponents();
    svc = TestBed.inject(CardDataService);
  });

  it('toggles a filter when the corresponding checkbox is clicked', () => {
    const fixture = TestBed.createComponent(AnnotationFiltersPanelComponent);
    fixture.detectChanges();
    const initial = svc.stellarMapData().filters.showMessier;
    fixture.componentInstance.toggle('showMessier');
    expect(svc.stellarMapData().filters.showMessier).toBe(!initial);
  });

  it('updates max magnitude via the slider', () => {
    const fixture = TestBed.createComponent(AnnotationFiltersPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.setMaxMagnitude(11);
    expect(svc.stellarMapData().filters.maxStarMagnitude).toBe(11);
  });
});
