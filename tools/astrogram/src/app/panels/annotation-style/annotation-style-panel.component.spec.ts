import { TestBed } from '@angular/core/testing';
import { CardDataService } from '../../services/card-data.service';
import { AnnotationStylePanelComponent } from './annotation-style-panel.component';

describe('AnnotationStylePanelComponent', () => {
  let svc: CardDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnotationStylePanelComponent],
    }).compileComponents();
    svc = TestBed.inject(CardDataService);
  });

  it('updates circle colour', () => {
    const fixture = TestBed.createComponent(AnnotationStylePanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.update({ color: '#abcdef' });
    expect(svc.stellarMapData().globalAnnotationSettings.color).toBe('#abcdef');
  });

  it('writes circle opacity as 0–1 even when slider emits 0–100', () => {
    const fixture = TestBed.createComponent(AnnotationStylePanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.setCircleOpacity(45);
    expect(svc.stellarMapData().globalAnnotationSettings.circleOpacity).toBeCloseTo(0.45);
  });

  it('toggles show magnitude', () => {
    const fixture = TestBed.createComponent(AnnotationStylePanelComponent);
    fixture.detectChanges();
    const before = svc.stellarMapData().globalAnnotationSettings.showMagnitude;
    fixture.componentInstance.update({ showMagnitude: !before });
    expect(svc.stellarMapData().globalAnnotationSettings.showMagnitude).toBe(!before);
  });
});
