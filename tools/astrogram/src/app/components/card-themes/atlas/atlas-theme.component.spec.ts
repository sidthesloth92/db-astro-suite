import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardDataService } from '../../../services/card-data.service';
import { AtlasThemeComponent } from './atlas-theme.component';

describe('AtlasThemeComponent', () => {
  let fixture: ComponentFixture<AtlasThemeComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtlasThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AtlasThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should render the object name in the hero title', () => {
    const hero = host.querySelector('[data-testid="card-hero"]');
    expect(hero?.textContent).toContain('The Rosette Nebula');
    expect(hero?.textContent).toContain('NGC 2237');
  });

  it('should render the total integration and derived frame count in the ledger', () => {
    const ledger = host.querySelector('.atl-ledger-head');
    expect(ledger?.textContent).toContain('10h 20m');
    expect(ledger?.textContent).toContain('124 frames');
  });

  it('should render one ledger row per enabled band tinted with the band colour', () => {
    const dots = host.querySelectorAll<HTMLElement>('.atl-ledger-dot');
    expect(dots.length).toBe(3);
    // First enabled band is Hα (#E5446D from the default filters).
    expect(dots[0].style.background).toBe('rgb(229, 68, 109)');
  });

  it('should render the designation from the catalogue id alone', () => {
    // The plate used to read "NGC 2237 · in Monoceros" — a constellation
    // hardcoded to the sample target, wrong for anything else.
    const designation = host.querySelector('.atl-designation');
    expect(designation?.textContent?.trim()).toBe('NGC 2237');
  });

  it('should render the colophon with location, bortle and author', () => {
    const colophon = host.querySelector('.atl-colophon');
    expect(colophon?.textContent).toContain('Irving, Texas');
    expect(colophon?.textContent).toContain('Bortle 9');
    expect(colophon?.textContent).toContain('@astrogram');
  });

  it('should wrap a long colophon location only between its comma-separated parts', () => {
    TestBed.inject(CardDataService).cardData.update((card) => ({
      ...card,
      location: 'Mount Laguna Observatory, San Diego County, California',
    }));
    fixture.detectChanges();

    const colophon = host.querySelector('.atl-colophon')?.textContent ?? '';
    expect(colophon).toContain('San\u00a0Diego\u00a0County, California');
  });

  it('should draw a white luminance band in ink so it shows on the cream paper', () => {
    TestBed.inject(CardDataService).cardData.update((card) => ({
      ...card,
      filters: card.filters.map((filter) => ({ ...filter, enabled: true })),
    }));
    fixture.detectChanges();

    const dots = host.querySelectorAll<HTMLElement>('.atl-ledger-dot');
    expect(dots[0].classList).toContain('atl-ledger-dot--light');
    expect(dots[1].classList).not.toContain('atl-ledger-dot--light');

    const ids = Array.from(host.querySelectorAll('.atl-chart-id'));
    const luminance = ids.find((id) => id.textContent?.trim() === 'L');
    expect(luminance?.getAttribute('fill')).toBe('#2B2316');
  });
});
