import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DaylightThemeComponent } from './daylight-theme.component';
import { CardDataService } from '../../../services/card-data.service';

describe('DaylightThemeComponent', () => {
  let fixture: ComponentFixture<DaylightThemeComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DaylightThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DaylightThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should render the object name in the hero', () => {
    const hero = host.querySelector('[data-testid="card-hero"]');
    expect(hero?.textContent).toContain('Rosette Nebula');
    expect(host.querySelector('.day-name')?.textContent).toContain('Rosette Nebula');
  });

  it('should show the catalogue line in the top row, opposite the datestamp', () => {
    // The catalogue line moved up into the row the brand lockup used to hold,
    // so the row still reads as two-ended rather than leaving an empty side.
    const topRow = host.querySelector('.day-brand');
    expect(topRow?.textContent).toContain('NGC 2237');
    expect(topRow?.textContent).toContain('Narrowband');
    expect(topRow?.querySelector('.day-date')).toBeTruthy();
  });

  it('should render the 2×2 giant stats from the card data', () => {
    const stats = host.querySelector('.day-stats');
    expect(stats?.textContent).toContain('Integration');
    expect(stats?.textContent).toContain('10h 20m');
    expect(stats?.textContent).toContain('124');
    expect(stats?.textContent).toContain('SHO');
    expect(stats?.textContent).toContain('9'); // bortle
  });

  it('should render a band legend entry per enabled filter tinted by band colour', () => {
    const ids = host.querySelectorAll<HTMLElement>('.day-legend-id');
    expect(ids.length).toBe(3);
    expect(ids[0].textContent?.trim()).toBe('Hα');
    expect(ids[0].style.color).toBe('rgb(229, 68, 109)');
  });

  it('should render gear chips and the author / location footer', () => {
    // One chip per equipment row. This was 4 while the theme picked rows by
    // index and skipped the guide scope; it now follows the user's own list.
    const chips = host.querySelectorAll('.day-chip');
    expect(chips.length).toBe(5);
    expect(host.querySelector('.day-author')?.textContent).toContain('@astrogram');
    expect(host.querySelector('.day-location')?.textContent).toContain('Irving, Texas');
  });

  it('should give a white luminance band an ink label and outlined swatches on the paper', () => {
    TestBed.inject(CardDataService).cardData.update((d) => ({
      ...d,
      filters: d.filters.map((f) => ({ ...f, enabled: true })),
    }));
    fixture.detectChanges();

    const ids = Array.from(host.querySelectorAll<HTMLElement>('.day-legend-id'));
    const luminance = ids.find((el) => el.textContent?.trim() === 'L');
    const alpha = ids.find((el) => el.textContent?.trim() === 'Hα');

    expect(luminance?.classList).toContain('day-legend-id--light');
    expect(luminance?.style.color).toBe('');
    expect(alpha?.style.color).toBe('rgb(229, 68, 109)');
    // One outlined bar segment and one outlined legend dot, both for L.
    expect(host.querySelectorAll('.day-light-swatch').length).toBe(2);
  });

  it('should keep each place name in the footer location whole', () => {
    TestBed.inject(CardDataService).cardData.update((d) => ({
      ...d,
      location: 'Mount Laguna Observatory, San Diego County',
    }));
    fixture.detectChanges();

    expect(host.querySelector('.day-location')?.textContent).toBe(
      'Mount\u00a0Laguna\u00a0Observatory, San\u00a0Diego\u00a0County',
    );
  });

  it('should split a seven-band legend into rows of four and three', () => {
    TestBed.inject(CardDataService).cardData.update((d) => ({
      ...d,
      filters: d.filters.map((f) => ({ ...f, enabled: true })),
    }));
    fixture.detectChanges();

    const legend = Array.from(host.querySelector('.day-legend')?.children ?? []);

    expect(legend.length).toBe(8);
    expect(legend[4].classList).toContain('day-legend-break');
  });

  it('should keep a short legend on one row', () => {
    expect(host.querySelector('.day-legend-break')).toBeNull();
  });
});
