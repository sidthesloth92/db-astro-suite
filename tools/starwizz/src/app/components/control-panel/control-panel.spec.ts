import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService, BreakpointService, MOBILE_BREAKPOINT_PX } from '@db-astro-suite/ui';

import { Scene3dService } from '../../services/scene3d.service';
import { SimulationService } from '../../services/simulation.service';
import { ControlPanel } from './control-panel';

describe('ControlPanel', () => {
  let component: ControlPanel;
  let fixture: ComponentFixture<ControlPanel>;
  let simService: SimulationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlPanel],
      providers: [{ provide: AnalyticsService, useValue: {} }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlPanel);
    component = fixture.componentInstance;
    simService = TestBed.inject(SimulationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the Shooting Star Speed slider only while shooting stars are enabled', () => {
    expect(component.isShootingStarSpeedVisible()).toBeTrue();

    simService.shootingStarsEnabled.set(false);

    expect(component.isShootingStarSpeedVisible()).toBeFalse();
  });

  it('should hide the Shooting Star Speed slider in Custom Path mode', () => {
    simService.updateDirection('path');

    expect(component.isShootingStarSpeedVisible()).toBeFalse();
  });

  describe('2D Rotation', () => {
    /** The Rotation slider row of the 2D panel. */
    function rotationRow(): HTMLElement | undefined {
      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.slider-row');
      return Array.from(rows).find(
        (candidate) => candidate.querySelector('.row-label')?.textContent?.trim() === 'Rotation',
      );
    }

    it('should start on the same gentle clockwise turn the app has always opened with', () => {
      expect(simService.getControlValue('rotationRate')).toBe(3);
      expect(rotationRow()?.querySelector('.row-value')?.textContent?.trim()).toBe('3 \u21BB');
    });

    it('should mark the middle of the track, where the handle rests when rotation is off', () => {
      expect(rotationRow()?.querySelector('.origin')).not.toBeNull();

      component.updateControlValue('rotationRate', 0);
      fixture.detectChanges();

      expect(rotationRow()?.querySelector<HTMLElement>('.dot')?.style.left).toBe('50%');
      expect(rotationRow()?.querySelector('.row-value')?.textContent?.trim()).toBe('Off');
    });

    it('should read an anticlockwise turn when the handle is left of the middle', () => {
      component.updateControlValue('rotationRate', -5);
      fixture.detectChanges();

      expect(simService.getControlValue('rotationRate')).toBe(-5);
      expect(rotationRow()?.querySelector<HTMLElement>('.dot')?.style.left).toBe('40%');
      expect(rotationRow()?.querySelector('.row-value')?.textContent?.trim()).toBe('5 \u21BA');
    });

    it('should leave the other 2D sliders filling from their left end', () => {
      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.slider-row');
      const zoom = Array.from(rows).find(
        (candidate) => candidate.querySelector('.row-label')?.textContent?.trim() === 'Zoom Speed',
      );

      expect(zoom).toBeDefined();
      expect(zoom?.querySelector('.origin')).toBeNull();
    });
  });

  describe('3D mode', () => {
    let scene3d: Scene3dService;

    function host(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }
    function rowLabels(): string[] {
      return Array.from(host().querySelectorAll('.row-label')).map((label) => label.textContent?.trim() ?? '');
    }
    function switchLabels(): string[] {
      return Array.from(host().querySelectorAll('.record-aux-label')).map((label) => label.textContent?.trim() ?? '');
    }
    /** The Sharp Stars switch in the 3D Stars box. */
    function sharpSwitch(): HTMLButtonElement {
      // Justification for the non-null assertion: the switch is always rendered in 3D mode,
      // and every spec that calls this has entered 3D first.
      return host().querySelector<HTMLButtonElement>('[role="switch"][aria-label="Sharp stars"]')!;
    }
    function enter3d(): void {
      component.updateRenderMode('3d');
      fixture.detectChanges();
    }

    beforeEach(() => {
      scene3d = TestBed.inject(Scene3dService);
    });

    it('should offer a 2D and 3D switch and start in 2D', () => {
      const tabs = Array.from(host().querySelectorAll('[role="tab"]')).map((tab) => tab.textContent?.trim());
      expect(tabs).toContain('2D');
      expect(tabs).toContain('3D');
      expect(simService.renderMode()).toBe('2d');
      expect(rowLabels()).toContain('Zoom Speed');
    });

    it('should replace the 2D controls with the 3D ones when 3D is chosen', () => {
      enter3d();
      const labels = rowLabels();
      expect(simService.renderMode()).toBe('3d');
      expect(labels).not.toContain('Zoom Speed');
      expect(labels).not.toContain('Star Count');
      expect(labels).toContain('Style');
      expect(labels).toContain('Star Amount');
      expect(labels).toContain('Twinkle');
    });

    it('should keep every 3D control in one pane with a single Stars box, like 2D', () => {
      enter3d();
      const boxes = host().querySelectorAll('.stars-section, .path-section');
      expect(boxes.length).toBe(1);
      // The camera controls are plain rows above the box; the star controls sit inside it.
      const inBox = Array.from(boxes[0].querySelectorAll('.row-label')).map((l) => l.textContent?.trim());
      expect(inBox).toContain('Star Amount');
      expect(inBox).not.toContain('Style');
      expect(inBox).not.toContain('Speed');
      expect(rowLabels()).not.toContain('Star Style');
    });

    describe('smoothness notice', () => {
      function notice(): HTMLElement | null {
        return host().querySelector<HTMLElement>('.notice-icon');
      }
      function useLayout(width: number): void {
        TestBed.inject(BreakpointService).updateFromWidth(width);
        fixture.detectChanges();
      }

      it('should advise recording on a desktop when 3D is chosen on a phone', () => {
        useLayout(MOBILE_BREAKPOINT_PX - 1);
        enter3d();

        expect(notice()?.getAttribute('aria-label')).toContain('record on a desktop computer');
      });

      it('should not show the notice in 2D on a phone', () => {
        useLayout(MOBILE_BREAKPOINT_PX - 1);

        expect(notice()).toBeNull();
      });

      it('should not show the notice in 3D on a desktop', () => {
        useLayout(MOBILE_BREAKPOINT_PX);
        enter3d();

        expect(notice()).toBeNull();
      });
    });

    it('should keep Format, Reset and Record available in 3D', () => {
      enter3d();
      expect(rowLabels()).toContain('Format');
      expect(host().textContent).toContain('Reset Animation');
      expect(host().querySelector('.record-row')).not.toBeNull();
    });

    it('should ignore an unknown mode', () => {
      component.updateRenderMode('4d');
      expect(simService.renderMode()).toBe('2d');
    });

    it('should show Direction and Star Depth for Travel, but no cloud or arrival controls', () => {
      enter3d();
      const labels = rowLabels();
      expect(labels).toContain('Direction');
      expect(labels).toContain('Star Depth');
      expect(labels).not.toContain('Cloud Depth');
      expect(switchLabels()).not.toContain('Zoom In');
    });

    it('should show Cloud Depth and the two arrival switches for Arrive, and hide Direction and Star Depth', () => {
      enter3d();
      component.updateSceneStyle('arrive');
      fixture.detectChanges();

      const labels = rowLabels();
      expect(labels).toContain('Cloud Depth');
      expect(labels).not.toContain('Direction');
      expect(labels).not.toContain('Star Depth');
      expect(switchLabels()).toContain('Zoom In');
      expect(switchLabels()).toContain('Stars Return At End');
    });

    it('should offer sharp stars as one switch that is on to begin with, with Spikes', () => {
      enter3d();
      expect(switchLabels()).toContain('Sharp Stars');
      expect(sharpSwitch().getAttribute('aria-checked')).toBe('true');
      expect(scene3d.settings().starStyle).toBe('sharp');
      expect(rowLabels()).toContain('Spikes');
    });

    it("should keep the photo's own stars and hide Spikes when Sharp Stars is switched off", () => {
      enter3d();

      sharpSwitch().click();
      fixture.detectChanges();
      expect(scene3d.settings().starStyle).toBe('original');
      expect(rowLabels()).not.toContain('Spikes');

      sharpSwitch().click();
      fixture.detectChanges();
      expect(scene3d.settings().starStyle).toBe('sharp');
      expect(rowLabels()).toContain('Spikes');
    });

    it('should explain how to aim when the Custom direction is chosen', () => {
      enter3d();
      component.updateSceneDirection('custom');
      fixture.detectChanges();
      expect(scene3d.direction()).toBe('custom');
      expect(host().querySelector('.path-hint')?.textContent).toContain('Drag the marker');
    });

    it('should ignore style and direction values it does not know', () => {
      component.updateSceneStyle('orbit');
      component.updateSceneDirection('sideways');
      expect(scene3d.style()).toBe('travel');
      expect(scene3d.direction()).toBe('left');
    });

    it('should offer Rotation with the camera controls in both 3D styles, off to begin with', () => {
      enter3d();
      expect(rowLabels()).toContain('Rotation');
      expect(component.formatSceneControlValue('rotation')).toBe('Off');
      const inBox = Array.from(host().querySelectorAll('.stars-section .row-label')).map((l) => l.textContent?.trim());
      expect(inBox).not.toContain('Rotation');

      component.updateSceneStyle('arrive');
      fixture.detectChanges();
      expect(rowLabels()).toContain('Rotation');
    });

    it('should rest the Rotation handle in the middle of its track and read which way it turns', () => {
      enter3d();
      const row = Array.from(host().querySelectorAll<HTMLElement>('.slider-row')).find(
        (candidate) => candidate.querySelector('.row-label')?.textContent?.trim() === 'Rotation',
      );
      expect(row).toBeDefined();
      expect(row?.querySelector<HTMLElement>('.dot')?.style.left).toBe('50%');
      expect(row?.querySelector('.origin')).not.toBeNull();
      expect(row?.querySelector('.row-value')?.textContent?.trim()).toBe('Off');

      component.updateSceneControl('rotation', -5);
      fixture.detectChanges();
      expect(scene3d.controls.rotation()).toBe(-5);
      expect(row?.querySelector<HTMLElement>('.dot')?.style.left).toBe('25%');
      expect(row?.querySelector('.row-value')?.textContent?.trim()).toBe('5\u00B0/s \u21BA');
    });

    it('should show each 3D slider value and pass changes on', () => {
      enter3d();
      component.updateSceneControl('speed', 7.5);
      fixture.detectChanges();
      expect(scene3d.controls.speed()).toBe(7.5);
      expect(component.formatSceneControlValue('speed')).toBe('7.5');
      expect(component.formatSceneControlValue('starAmount')).toBe('100');
    });

    it('should keep the record button disabled in 3D until the scene is ready', () => {
      simService.isImageLoaded.set(true);
      expect(component.isRecordDisabled()).toBeFalse();

      enter3d();
      expect(component.isRecordDisabled()).toBeTrue();

      scene3d.status.set('ready');
      expect(component.isRecordDisabled()).toBeFalse();
    });

    it('should not let the mode change while a recording is running', () => {
      simService.recordingState.set('recording');
      fixture.detectChanges();
      const tabs = Array.from(host().querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
        (tab) => tab.textContent?.trim() === '2D' || tab.textContent?.trim() === '3D',
      );
      expect(tabs.length).toBe(2);
      expect(tabs.every((tab) => tab.disabled)).toBeTrue();
    });

    it('should restore the 3D settings too on Reset Params', () => {
      component.updateSceneStyle('arrive');
      scene3d.setSharpStars(false);
      component.updateSceneControl('twinkle', 8);

      component.resetParams();

      expect(scene3d.style()).toBe('travel');
      expect(scene3d.starStyle()).toBe('sharp');
      expect(scene3d.controls.twinkle()).toBe(0);
    });
  });

  it('should collapse every star control when the starfield is removed', () => {
    const host = fixture.nativeElement as HTMLElement;
    const starsSection = host.querySelector('.stars-section');
    expect(starsSection).not.toBeNull();
    // Stars on: the field sliders and the Shooting Stars toggle live in the section.
    expect(starsSection?.querySelectorAll('.slider-row').length).toBeGreaterThan(0);
    expect(starsSection?.querySelector('.record-aux')).not.toBeNull();

    simService.starsEnabled.set(false);
    fixture.detectChanges();

    // Stars off: the section header (with its master switch) stays, but all star
    // controls are gone — leaving the user to focus on the camera/recording controls.
    expect(host.querySelector('.stars-section')).not.toBeNull();
    expect(host.querySelectorAll('.stars-section .slider-row').length).toBe(0);
    expect(host.querySelector('.stars-section .record-aux')).toBeNull();
  });

  describe('record split-button', () => {
    it('should show the default quality preset in the record button label', () => {
      expect(component.buttonText()).toBe('Start Recording · 30s · Social Media');
    });

    it('should update the preset and label when a menu item is selected', () => {
      component.selectPreset('compact');

      expect(simService.recordingPreset()).toBe('compact');
      expect(component.buttonText()).toBe('Start Recording · 30s · Smaller File');
    });

    it('should ignore unknown preset values', () => {
      component.selectPreset('not-a-preset');

      expect(simService.recordingPreset()).toBe('social');
    });

    it('should list every preset with a live size estimate for the selected format', () => {
      expect(component.presetMenuItems().map((item) => item.detail)).toEqual([
        '~47 MB',
        '~70 MB',
        '~16 MB',
      ]);

      simService.currentFormat.set('youtube-4k');

      expect(component.presetMenuItems().map((item) => item.detail)).toEqual([
        '~187 MB',
        '~280 MB',
        '~65 MB',
      ]);
    });

    it('should disable the preset menu while recording', () => {
      simService.isImageLoaded.set(true);
      fixture.detectChanges();
      const chevron = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.record-split .segment.chevron',
      );
      expect(chevron?.disabled).toBeFalse();

      simService.recordingState.set('recording');
      fixture.detectChanges();

      expect(chevron?.disabled).toBeTrue();
    });
  });

  describe('pinned footer', () => {
    /** The footer that stays visible below the scrolling controls. */
    function footer(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.panel-footer');
    }

    it('should keep the reset buttons, the From beginning switch and the record button outside the scrolling controls', () => {
      const scroll = (fixture.nativeElement as HTMLElement).querySelector('.panel-scroll');
      const labels = Array.from(footer()?.querySelectorAll('button') ?? []).map((b) =>
        b.textContent?.trim(),
      );

      expect(labels).toContain('Reset Animation');
      expect(labels).toContain('Reset Params');
      expect(
        footer()?.querySelector('[role="switch"][aria-label="Record from beginning"]'),
      ).not.toBeNull();
      expect(footer()?.querySelector('.record-split')).not.toBeNull();
      expect(scroll?.querySelector('.record-split, [aria-label="Record from beginning"]')).toBeNull();
    });

    it('should place From beginning above the record button, which comes last', () => {
      simService.recordingError.set('Recording produced no video, please try again.');
      simService.lastRecording.set({
        blob: new Blob([new Uint8Array(8)]),
        filename: 'starfield_starwizz_9_16_1080_1920.mp4',
        mimeType: 'video/mp4',
        sizeMb: 47,
      });
      fixture.detectChanges();

      const order = Array.from(
        footer()?.querySelectorAll(
          '.panel-actions, .record-last, .record-aux, .record-error, .record-split',
        ) ?? [],
      ).map((el) => el.classList[0]);

      expect(order).toEqual([
        'panel-actions',
        'record-last',
        'record-aux',
        'record-error',
        'record-split',
      ]);
    });
  });

  describe('recording error and last-video row', () => {
    it('should show the recording error only when one is set', () => {
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.record-error')).toBeNull();

      simService.recordingError.set('Recording produced no video — please try again.');
      fixture.detectChanges();

      expect(host.querySelector('.record-error')?.textContent).toContain(
        'Recording produced no video',
      );
    });

    it('should show the last-video row with size and a Save action when a recording is retained', () => {
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.record-last')).toBeNull();

      simService.lastRecording.set({
        blob: new Blob([new Uint8Array(8)]),
        filename: 'starfield_starwizz_9_16_1080_1920.mp4',
        mimeType: 'video/mp4',
        sizeMb: 47,
      });
      fixture.detectChanges();

      expect(host.querySelector('.record-last-label')?.textContent).toContain('~47 MB');
      const save = spyOn(simService, 'saveLastRecording');
      host.querySelector<HTMLButtonElement>('.record-last button')?.click();
      expect(save).toHaveBeenCalled();
    });
  });
});
