import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

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
      expect(labels).toContain('Star Style');
      expect(labels).toContain('Star Amount');
      expect(labels).toContain('Twinkle');
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

    it('should show Spikes only for the Sharp star style', () => {
      enter3d();
      expect(rowLabels()).not.toContain('Spikes');

      component.updateStarStyle('sharp');
      fixture.detectChanges();
      expect(rowLabels()).toContain('Spikes');
    });

    it('should explain how to aim when the Custom direction is chosen', () => {
      enter3d();
      component.updateSceneDirection('custom');
      fixture.detectChanges();
      expect(scene3d.direction()).toBe('custom');
      expect(host().querySelector('.path-hint')?.textContent).toContain('Drag the marker');
    });

    it('should ignore style, direction and star style values it does not know', () => {
      component.updateSceneStyle('orbit');
      component.updateSceneDirection('sideways');
      component.updateStarStyle('blurry');
      expect(scene3d.style()).toBe('travel');
      expect(scene3d.direction()).toBe('forward');
      expect(scene3d.starStyle()).toBe('original');
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
      component.updateStarStyle('sharp');
      component.updateSceneControl('twinkle', 8);

      component.resetParams();

      expect(scene3d.style()).toBe('travel');
      expect(scene3d.starStyle()).toBe('original');
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
