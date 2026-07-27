import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AnalyticsService,
          useValue: jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackEvent']),
        },
      ],
    }).compileComponents();
  });

  it('creates the app shell with the suite header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('dba-ui-header')).toBeTruthy();
  });

  it('lays out the stage and the controls panel side by side', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('main.as-container');
    expect(container).toBeTruthy();
    expect(container?.querySelector('dba-as-spike-stage')).toBeTruthy();
    expect(container?.querySelector('dba-as-side-panel')).toBeTruthy();
  });
});
