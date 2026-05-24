import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { CardDataService } from '../../services/card-data.service';
import { ExportCoordinatorService } from '../../services/export-coordinator.service';
import { ExportPanelComponent } from './export-panel.component';

describe('ExportPanelComponent', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let coordinator: jasmine.SpyObj<ExportCoordinatorService>;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'trackEvent',
      'trackSettingChanged',
    ]);
    coordinator = jasmine.createSpyObj<ExportCoordinatorService>('ExportCoordinatorService', [
      'register',
      'trigger',
    ]);
    await TestBed.configureTestingModule({
      imports: [ExportPanelComponent],
      providers: [
        CardDataService,
        { provide: AnalyticsService, useValue: analytics },
        { provide: ExportCoordinatorService, useValue: coordinator },
      ],
    }).compileComponents();
  });

  it('persists the format selection on CardDataService', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    const svc = TestBed.inject(CardDataService);
    expect(fixture.componentInstance.format()).toBe('jpeg');
    fixture.componentInstance.selectFormat('png');
    expect(svc.exportFormat()).toBe('png');
    expect(fixture.componentInstance.format()).toBe('png');
    expect(analytics.trackSettingChanged).toHaveBeenCalledWith('export_format', 'png');
  });

  it('tracks an analytics event when a share target is clicked', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    const target = fixture.componentInstance.shareTargets.find((t) => t.id === 'link');
    if (!target) {
      fail('expected a `link` share target');
      return;
    }
    fixture.componentInstance.selectShareTarget(target);
    expect(analytics.trackEvent).toHaveBeenCalledWith('astrogram_share_click', { target: 'link' });
  });

  it('ignores clicks on disabled share targets', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    const target = fixture.componentInstance.shareTargets.find((t) => t.id === 'instagram');
    if (!target || !target.disabled) {
      fail('expected `instagram` to be disabled');
      return;
    }
    fixture.componentInstance.selectShareTarget(target);
    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });

  it('triggers the export coordinator when the CTA is clicked', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    const cta = fixture.nativeElement.querySelector('.cta-btn') as HTMLButtonElement;
    cta.click();
    expect(coordinator.trigger).toHaveBeenCalledTimes(1);
  });
});
