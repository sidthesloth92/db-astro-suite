import { Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService, BreakpointService } from '@db-astro-suite/ui';
import { App } from './app';
import { ControlPanel } from './components/control-panel/control-panel';
import { Simulator } from './components/simulator/simulator';
import { InAppBrowserService } from './services/in-app-browser.service';
import { SimulationService } from './services/simulation.service';

/** Lightweight stand-ins so App can render without the canvas/animation machinery. */
@Component({ selector: 'dba-sw-simulator', standalone: true, template: '' })
class SimulatorStub {}

@Component({ selector: 'dba-sw-control-panel', standalone: true, template: '' })
class ControlPanelStub {
  readonly demoRequested = output<void>();
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AnalyticsService, useValue: { trackVideoGeneration: () => undefined } }],
    })
      .overrideComponent(App, {
        remove: { imports: [Simulator, ControlPanel] },
        add: { imports: [SimulatorStub, ControlPanelStub] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the branded header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const header = (fixture.nativeElement as HTMLElement).querySelector('dba-ui-header');
    expect(header?.getAttribute('title')).toBe('STARWIZZ');
  });

  describe('in-app browser alert', () => {
    function alertDialog(fixture: ComponentFixture<App>): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');
    }

    function mainContent(fixture: ComponentFixture<App>): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('main');
    }

    it('should not show the alert or block the page in a regular browser', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(alertDialog(fixture)).toBeNull();
      expect(mainContent(fixture)?.inert).toBe(false);
    });

    it('should show the alert and block the page behind it inside Instagram', () => {
      TestBed.overrideProvider(InAppBrowserService, {
        useValue: {
          browser: { appName: 'Instagram', platform: 'android' },
          externalBrowserUrl: 'intent://dbastrosuite.com/starwizz/#Intent;scheme=https;end',
        },
      });
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(alertDialog(fixture)?.textContent).toContain('Instagram’s built-in browser');
      expect(alertDialog(fixture)?.querySelector('a')?.textContent?.trim()).toBe('Open in browser');
      expect(mainContent(fixture)?.inert).toBe(true);
    });
  });

  describe('mobile quality picker', () => {
    let fixture: ComponentFixture<App>;
    let simService: SimulationService;

    /** Renders the mobile shell with an image loaded so the record button is live. */
    function renderMobile(): void {
      simService = TestBed.inject(SimulationService);
      TestBed.inject(BreakpointService).isMobile.set(true);
      simService.isImageLoaded.set(true);
      simService.recordFromBeginning.set(false);
      fixture = TestBed.createComponent(App);
      fixture.detectChanges();
    }

    function recordButton(): HTMLButtonElement {
      return (fixture.nativeElement as HTMLElement).querySelector(
        '.sw-mobile-record',
      ) as HTMLButtonElement;
    }

    function menuItems(): HTMLButtonElement[] {
      return Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.sw-quality-item'),
      );
    }

    function labels(): (string | undefined)[] {
      return menuItems().map((b) =>
        b.querySelector('.sw-quality-item__label')?.textContent?.trim(),
      );
    }

    it('should open the quality menu instead of recording when tapped while idle', () => {
      renderMobile();
      recordButton().click();
      fixture.detectChanges();

      expect(labels()).toEqual(['Smaller', 'Social', 'Max']);
      expect(simService.recordingState()).toBe('idle');
    });

    it('should highlight the recommended (Social) preset', () => {
      renderMobile();
      recordButton().click();
      fixture.detectChanges();

      const recommended = (fixture.nativeElement as HTMLElement).querySelector(
        '.sw-quality-item.is-recommended .sw-quality-item__label',
      );
      expect(recommended?.textContent?.trim()).toBe('Social');
    });

    it('should set the chosen quality and start recording when a menu item is tapped', () => {
      renderMobile();
      recordButton().click();
      fixture.detectChanges();

      menuItems()[2].click(); // "Max"
      fixture.detectChanges();

      expect(simService.recordingPreset()).toBe('maximum');
      expect(simService.recordingState()).toBe('recording');
      expect(menuItems().length).toBe(0);
    });

    it('should stop recording (not reopen the menu) when tapped while recording', () => {
      renderMobile();
      simService.recordingState.set('recording');
      fixture.detectChanges();

      recordButton().click();
      fixture.detectChanges();

      expect(simService.recordingState()).toBe('idle');
      expect(menuItems().length).toBe(0);
    });

    function seedLastRecording(): void {
      simService.lastRecording.set({
        blob: new Blob([new Uint8Array(8)]),
        filename: 'starfield_starwizz_9_16_1080_1920.mp4',
        mimeType: 'video/mp4',
        sizeMb: 47,
      });
      fixture.detectChanges();
    }

    function resultChip(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('.sw-result-chip');
    }

    it('should show a "Video ready" chip with the size after a recording is retained', () => {
      renderMobile();
      expect(resultChip()).toBeNull();

      seedLastRecording();

      expect(resultChip()?.textContent).toContain('Video ready · ~47 MB');
    });

    it('should save the retained recording from the chip\'s labelled Save button', () => {
      renderMobile();
      seedLastRecording();
      const save = spyOn(simService, 'saveLastRecording');

      const saveButton = Array.from(
        resultChip()?.querySelectorAll<HTMLButtonElement>('button') ?? [],
      ).find((button) => button.textContent?.trim() === 'Save');
      saveButton?.click();

      expect(saveButton).toBeDefined();
      expect(save).toHaveBeenCalled();
    });

    it('should dismiss the chip and re-show it for the next recording', () => {
      renderMobile();
      seedLastRecording();

      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('.sw-result-chip__dismiss')
        ?.click();
      fixture.detectChanges();
      expect(resultChip()).toBeNull();

      // A new finished recording un-dismisses the chip.
      seedLastRecording();
      expect(resultChip()).not.toBeNull();
    });

    it('should show the recording error label when the service reports one', () => {
      renderMobile();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.sw-record-error')).toBeNull();

      simService.recordingError.set('Recording is not supported on this device or browser.');
      fixture.detectChanges();

      expect(host.querySelector('.sw-record-error')?.textContent).toContain('not supported');
    });
  });
});
