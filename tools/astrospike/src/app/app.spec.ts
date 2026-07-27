import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService, BreakpointService } from '@db-astro-suite/ui';
import { App } from './app';

describe('App', () => {
  let breakpoints: BreakpointService;

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
    breakpoints = TestBed.inject(BreakpointService);
  });

  /**
   * Renders the shell at the requested viewport class. The breakpoint is set
   * after the first change detection because the service initialises itself
   * from the real window width, and the Karma frame is narrow enough to read
   * as mobile.
   */
  function renderAt(isMobile: boolean): ComponentFixture<App> {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    breakpoints.isMobile.set(isMobile);
    fixture.detectChanges();
    return fixture;
  }

  it('creates the app shell with the suite header', () => {
    const fixture = renderAt(false);
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('dba-ui-header')).toBeTruthy();
  });

  it('lays out the stage and the controls panel side by side on desktop', () => {
    const fixture = renderAt(false);
    const container = fixture.nativeElement.querySelector('main.as-container');
    expect(container).toBeTruthy();
    expect(container?.querySelector('dba-as-spike-stage')).toBeTruthy();
    expect(container?.querySelector('dba-as-control-panel')).toBeTruthy();
    // No floating sheet competes with the panel on desktop.
    expect(fixture.nativeElement.querySelector('dba-ui-floating-sheet')).toBeNull();
  });

  it('should move the controls into a floating sheet on mobile so the stage stays visible', () => {
    const fixture = renderAt(true);
    const container = fixture.nativeElement.querySelector('main.as-container--mobile');

    expect(container).toBeTruthy();
    expect(container?.querySelector('dba-as-spike-stage')).toBeTruthy();
    const sheet = fixture.nativeElement.querySelector('dba-ui-floating-sheet');
    expect(sheet).toBeTruthy();
    expect(sheet?.querySelector('dba-as-control-panel')).toBeTruthy();
  });

  it('should open the controls sheet from the mobile button and hide the button while open', () => {
    const fixture = renderAt(true);
    const openButton = (): HTMLButtonElement | null =>
      fixture.nativeElement.querySelector('button[aria-label="Open controls"]');

    expect(openButton()).toBeTruthy();
    openButton()?.click();
    fixture.detectChanges();

    // The sheet's own close control takes over once it is expanded.
    expect(openButton()).toBeNull();
  });
});
