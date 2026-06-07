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
});
