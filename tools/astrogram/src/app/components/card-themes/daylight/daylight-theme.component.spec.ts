import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DaylightThemeComponent } from './daylight-theme.component';

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
    const chips = host.querySelectorAll('.day-chip');
    expect(chips.length).toBe(4);
    expect(host.querySelector('.day-author')?.textContent).toContain('@astrogram');
    expect(host.querySelector('.day-location')?.textContent).toContain('Irving, Texas');
  });
});
