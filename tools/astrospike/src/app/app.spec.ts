import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService, BreakpointService } from '@db-astro-suite/ui';
import { App } from './app';
import { SpikeEditorService } from './services/spike-editor.service';

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
    // The controls pane is not rendered before an image exists, so anything
    // asserting on it needs the editor to look loaded.
    TestBed.inject(SpikeEditorService).isDetecting.set(true);
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

  it('should open the mobile sheet when a star is opened for tuning', () => {
    const fixture = renderAt(true);
    const editor = TestBed.inject(SpikeEditorService);
    expect(fixture.nativeElement.querySelector('button[aria-label="Open controls"]')).toBeTruthy();

    editor.openStarControls(3);
    fixture.detectChanges();

    // The sheet is where the pane — and so the star's controls — lives here.
    expect(fixture.nativeElement.querySelector('button[aria-label="Open controls"]')).toBeNull();
  });

  it('should leave the desktop shell alone when a star is opened for tuning', () => {
    const fixture = renderAt(false);
    const editor = TestBed.inject(SpikeEditorService);

    editor.openStarControls(3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('dba-ui-floating-sheet')).toBeNull();
  });

  describe('how to use', () => {
    /** The overlay dialog, when it is showing. */
    function overlay(): HTMLElement | null {
      return fixture.nativeElement.querySelector('[role="dialog"]');
    }

    let fixture: ComponentFixture<App>;

    beforeEach(() => {
      fixture = renderAt(false);
    });

    it('should not open on arrival', () => {
      // Landing in a modal is a worse first impression than a studio you can
      // poke at, so it waits to be asked for.
      expect(overlay()).toBeNull();
    });

    it('should open from the pane-header action and close again', () => {
      const open = (): HTMLButtonElement | null =>
        fixture.nativeElement.querySelector('.panel-header button');
      open()?.click();
      fixture.detectChanges();
      expect(overlay()).toBeTruthy();

      const gotIt: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('[role="dialog"] button'),
      );
      gotIt[gotIt.length - 1].click();
      fixture.detectChanges();

      expect(overlay()).toBeNull();
    });

    it('should offer no suppression switch, having nothing to suppress', () => {
      (fixture.nativeElement.querySelector('.panel-header button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('dba-ui-switch')).toBeNull();
    });
  });
});
