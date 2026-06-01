import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';

import { Simulator } from './simulator';

describe('Simulator', () => {
  let component: Simulator;
  let fixture: ComponentFixture<Simulator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Simulator],
      providers: [{ provide: AnalyticsService, useValue: {} }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Simulator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
