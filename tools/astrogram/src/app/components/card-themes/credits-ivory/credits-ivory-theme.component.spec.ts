import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditsIvoryThemeComponent } from './credits-ivory-theme.component';
import { CardDataService } from '../../../services/card-data.service';

describe('CreditsIvoryThemeComponent', () => {
  let fixture: ComponentFixture<CreditsIvoryThemeComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditsIvoryThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditsIvoryThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should split the object name into a solid and an outline line', () => {
    const hero = host.querySelector('[data-testid="card-hero"]');
    expect(host.querySelector('.cri-title-solid')?.textContent).toContain('Rosette');
    expect(host.querySelector('.cri-title-outline')?.textContent).toContain('Nebula');
    expect(hero).toBeTruthy();
  });

  it('should render the billing block credits from the card data', () => {
    const billing = host.querySelector('.cri-billing');
    expect(billing?.textContent).toContain('Captured by');
    expect(billing?.textContent).toContain('@astrogram');
    expect(billing?.textContent).toContain('124 frames');
  });

  it('should bill every equipment row under its own label', () => {
    // The billing block used to read gear by array position and pair it with
    // fixed roles ("Shot on" = rows 0 and 1, "Riding" = row 2), which mislabels
    // the moment a row is renamed, reordered or deleted. Each row now carries
    // the user's own label.
    const credits = host.querySelectorAll('.cri-credit');
    const text = Array.from(credits).map((el) => el.textContent ?? '');

    expect(text.some((t) => t.includes('Telescope') && t.includes('Askar 103 APO'))).toBeTrue();
    expect(text.some((t) => t.includes('Mount') && t.includes('Sky-Watcher Wave 150i'))).toBeTrue();
    // The guide scope used to be skipped outright by the positional slots.
    expect(text.some((t) => t.includes('Guide Scope and Camera'))).toBeTrue();
  });

  it('should render a big numeric release date in MM.DD.YY form', () => {
    const date = host.querySelector('.cri-release-date');
    expect(date?.textContent?.trim()).toMatch(/^\d{2}\.\d{2}\.\d{2}$/);
  });

  it('should render the release sub-line with bortle and location', () => {
    const sub = host.querySelector('.cri-release-sub');
    // "Under Bortle 9 skies" is held together with no-break spaces so a long
    // location wraps after it rather than inside it.
    expect(sub?.textContent).toContain('Bortle\u00a09');
    expect(sub?.textContent).toContain('Irving, Texas');
  });

  describe('with every filter enabled', () => {
    beforeEach(() => {
      const data = TestBed.inject(CardDataService);
      data.cardData.update((d) => ({ ...d, filters: d.filters.map((f) => ({ ...f, enabled: true })) }));
      fixture.detectChanges();
    });

    it('should print the white luminance band in ink so it shows on the paper', () => {
      const bands = Array.from(host.querySelectorAll<HTMLElement>('.cri-band'));
      const luminance = bands.find((el) => el.textContent?.trim().startsWith('L '));

      expect(luminance?.classList).toContain('cri-band--light');
      expect(luminance?.style.color).toBe('');
      expect(host.querySelectorAll('.cri-strip-seg--light').length).toBe(1);
    });

    it('should keep the coloured bands in their own colours', () => {
      const bands = Array.from(host.querySelectorAll<HTMLElement>('.cri-band'));
      const alpha = bands.find((el) => el.textContent?.includes('Hα'));

      expect(alpha?.classList).not.toContain('cri-band--light');
      expect(alpha?.style.color).toBe('rgb(229, 68, 109)');
    });

    it('should split seven bands into rows of four and three', () => {
      const separators = Array.from(host.querySelectorAll('.cri-credit-bands .cri-faint'));

      expect(separators.length).toBe(6);
      expect(separators.findIndex((el) => el.classList.contains('cri-band-break'))).toBe(3);
    });
  });
});
