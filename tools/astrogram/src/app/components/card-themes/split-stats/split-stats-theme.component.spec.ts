import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplitStatsThemeComponent } from './split-stats-theme.component';
import { CardDataService } from '../../../services/card-data.service';

describe('SplitStatsThemeComponent', () => {
  let fixture: ComponentFixture<SplitStatsThemeComponent>;
  let host: HTMLElement;
  let data: CardDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitStatsThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitStatsThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    data = TestBed.inject(CardDataService);
    fixture.detectChanges();
  });

  it('should keep the designed headline for a short object name', () => {
    expect(host.querySelector('.sps-name')?.textContent).toContain('Rosette Nebula');
    expect(host.querySelector('.sps-name--long')).toBeNull();
  });

  it('should mark a long object name for the smaller landscape headline', () => {
    data.cardData.update((d) => ({ ...d, title: 'NGC 7000 - North America Nebula Complex' }));
    fixture.detectChanges();

    expect(host.querySelector('.sps-name--long')?.textContent).toContain('North America Nebula Complex');
  });

  it('should keep each place name in the footer location whole', () => {
    data.cardData.update((d) => ({ ...d, location: 'Mount Laguna Observatory, San Diego County' }));
    fixture.detectChanges();

    expect(host.querySelector('.sps-loc')?.textContent).toBe(
      'Mount Laguna Observatory, San Diego County',
    );
  });

  it('should split a seven-band legend into rows of four and three', () => {
    TestBed.inject(CardDataService).cardData.update((d) => ({
      ...d,
      filters: d.filters.map((f) => ({ ...f, enabled: true })),
    }));
    fixture.detectChanges();

    const legend = Array.from(host.querySelector('.sps-legend')?.children ?? []);

    expect(legend.length).toBe(8);
    expect(legend[4].classList).toContain('sps-legend-break');
  });

  it('should keep a short legend on one row', () => {
    expect(host.querySelector('.sps-legend-break')).toBeNull();
  });
});
