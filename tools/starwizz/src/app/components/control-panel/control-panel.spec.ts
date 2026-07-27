import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

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

  it('should collapse every star control when the starfield is removed', () => {
    simService.activePanelSection.set('stars');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const starsSection = host.querySelector('.stars-section');
    expect(starsSection).not.toBeNull();
    // Stars on: the field sliders and the Shooting Stars sub-header live in the section.
    expect(starsSection?.querySelectorAll('.slider-row').length).toBeGreaterThan(0);
    expect(starsSection?.querySelector('.stars-subheader')).not.toBeNull();

    simService.starsEnabled.set(false);
    fixture.detectChanges();

    // Stars off: the section header (with its master switch) stays, but all star
    // controls are gone — leaving the user to focus on the camera/recording controls.
    expect(host.querySelector('.stars-section')).not.toBeNull();
    expect(host.querySelectorAll('.stars-section .slider-row').length).toBe(0);
    expect(host.querySelector('.stars-section .stars-subheader')).toBeNull();
  });

  describe('panel tabs (Scene / Stars)', () => {
    it('should default to the Scene tab with scene controls and no star sliders', () => {
      const host = fixture.nativeElement as HTMLElement;

      expect(simService.activePanelSection()).toBe('scene');
      expect(host.querySelector('.record-options')).not.toBeNull();
      expect(host.querySelector('.stars-section')).toBeNull();
    });

    it('should swap to star controls when the Stars tab is selected', () => {
      component.onPanelSectionChange('stars');
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.stars-section')).not.toBeNull();
      expect(host.querySelector('.record-options')).toBeNull();
    });

    it('should keep the reset buttons and record button visible on both tabs', () => {
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.panel-actions')).not.toBeNull();
      expect(host.querySelector('.record-split')).not.toBeNull();

      simService.activePanelSection.set('stars');
      fixture.detectChanges();

      expect(host.querySelector('.panel-actions')).not.toBeNull();
      expect(host.querySelector('.record-split')).not.toBeNull();
    });

    it('should render the record button as the last control of the panel', () => {
      const host = fixture.nativeElement as HTMLElement;
      const recordRow = host.querySelector('.record-row');

      expect(recordRow?.lastElementChild?.classList.contains('record-split')).toBeTrue();
      // The record row itself is the panel's final rendered block.
      expect(recordRow?.nextElementSibling).toBeNull();
    });
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

  describe('clip-end controls (loop / duration / freeze)', () => {
    it('should count down the remaining seconds while recording', () => {
      simService.durationEnabled.set(true);
      simService.recordingDurationSeconds.set(10);
      simService.recordingState.set('recording');
      simService.recordingDuration.set(3);

      expect(component.buttonText()).toBe('Recording... 7s');
    });

    it('should reflect a custom duration in the idle label and the size estimates', () => {
      simService.durationEnabled.set(true);
      simService.recordingDurationSeconds.set(60);

      expect(component.buttonText()).toBe('Start Recording · 60s · Social Media');
      // Double the default 30s clip → double the ~47 MB social estimate.
      expect(component.presetMenuItems()[0].detail).toBe('~93 MB');
    });

    it('should count elapsed seconds (not a countdown) for a finalized path clip', () => {
      simService.updateDirection('path');
      simService.setCameraStart();
      simService.setCameraEnd();
      simService.finalizePath();
      simService.recordingState.set('recording');
      simService.recordingDuration.set(7);

      expect(component.buttonText()).toBe('Recording... (7s)');
    });

    it('should clamp typed duration values into the allowed range', () => {
      component.onDurationSecondsChange('9999');
      expect(simService.recordingDurationSeconds()).toBe(300);

      component.onDurationSecondsChange('0');
      expect(simService.recordingDurationSeconds()).toBe(1);

      component.onDurationSecondsChange('nonsense');
      expect(simService.recordingDurationSeconds()).toBe(30);
    });

    it('should render the loop, duration and freeze rows with the seconds inputs', () => {
      simService.durationEnabled.set(true);
      simService.freezeFrameEnabled.set(true);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const labels = Array.from(host.querySelectorAll('.record-options .record-aux-label')).map(
        (el) => el.textContent?.trim(),
      );
      expect(labels).toContain('Loop');
      expect(labels).toContain('Duration');
      expect(labels).toContain('Freeze frame');
      // Duration + freeze-at + freeze-hold inputs.
      expect(host.querySelectorAll('.record-options .record-seconds-input').length).toBe(3);
    });

    it('should hide the duration row and freeze-at input in Custom Path mode', () => {
      simService.updateDirection('path');
      simService.freezeFrameEnabled.set(true);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const labels = Array.from(host.querySelectorAll('.record-options .record-aux-label')).map(
        (el) => el.textContent?.trim(),
      );
      expect(labels).not.toContain('Duration');
      // Only the end-of-pass hold input remains.
      expect(host.querySelectorAll('.record-options .record-seconds-input').length).toBe(1);
    });

    it('should show the long-clip quality warning only past sixty seconds', () => {
      const host = fixture.nativeElement as HTMLElement;
      simService.durationEnabled.set(true);
      simService.recordingDurationSeconds.set(45);
      fixture.detectChanges();
      expect(host.querySelector('.record-warning')).toBeNull();

      simService.recordingDurationSeconds.set(90);
      fixture.detectChanges();
      expect(host.querySelector('.record-warning')).not.toBeNull();
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
