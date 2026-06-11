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

  it('should hide the Shooting Star Speed slider when shooting stars are disabled', () => {
    expect(component.visibleControlNames()).toContain('shootingStarSpeed');

    simService.shootingStarsEnabled.set(false);

    expect(component.visibleControlNames()).not.toContain('shootingStarSpeed');
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
});
