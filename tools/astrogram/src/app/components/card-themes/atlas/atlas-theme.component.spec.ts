import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('should render the colophon with location, bortle and author', () => {
    const colophon = host.querySelector('.atl-colophon');
    expect(colophon?.textContent).toContain('Irving, Texas');
    expect(colophon?.textContent).toContain('Bortle 9');
    expect(colophon?.textContent).toContain('@astrogram');
  });
});
