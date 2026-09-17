import { TestBed } from '@angular/core/testing';
import { RingedPlanetThemeComponent } from './ringed-planet-theme.component';
import { CardDataService } from '../../../services/card-data.service';

/** Renders the component against the default `CardDataService` document. */
function render(): HTMLElement {
  TestBed.configureTestingModule({ imports: [RingedPlanetThemeComponent] });
  const fixture = TestBed.createComponent(RingedPlanetThemeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

/** Renders the component with the given secondary picker colour. */
function renderWithSecondary(secondaryAccentColor: string): HTMLElement {
  TestBed.configureTestingModule({ imports: [RingedPlanetThemeComponent] });
  TestBed.inject(CardDataService).cardData.update((d) => ({ ...d, secondaryAccentColor }));
  const fixture = TestBed.createComponent(RingedPlanetThemeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RingedPlanetThemeComponent', () => {
  it('should render the object name in the hero title', () => {
    const el = render();
    const hero = el.querySelector('[data-testid="card-hero"]');
    expect(hero).toBeTruthy();
    expect(hero?.textContent).toContain('Rosette Nebula');
  });

  it('should draw one ring legend swatch per enabled band', () => {
    const el = render();
    const swatches = el.querySelectorAll('.rpl-legend-swatch');
    expect(swatches.length).toBe(3);
    expect(el.textContent).toContain('OIII');
  });

  it('should paint the planet body in the designed purples for the theme default secondary colour', () => {
    const el = renderWithSecondary('#8A5BC2');
    const stops = Array.from(el.querySelectorAll('#ringed-planet-body stop'));
    expect(stops.map((stop) => stop.getAttribute('stop-color'))).toEqual([
      '#c9a6e8',
      '#8a5bc2',
      '#46256e',
      '#1c0e33',
    ]);
    expect(el.querySelector<HTMLElement>('.rpl-root')?.style.getPropertyValue('--rpl-glow-rgb')).toBe('90, 50, 130');
  });

  it('should paint the planet body and its glow in the secondary colour', () => {
    const el = renderWithSecondary('#FF00FF');
    const stops = Array.from(el.querySelectorAll('#ringed-planet-body stop'));
    expect(stops[1]?.getAttribute('stop-color')).toBe('#ff00ff');
    expect(stops[2]?.getAttribute('stop-color')).toBe('#810091');
    expect(el.querySelector<HTMLElement>('.rpl-root')?.style.getPropertyValue('--rpl-glow-rgb')).toBe('166, 0, 171');
  });

  it('should credit the author on the card', () => {
    // The author is collected by the Object Info panel but was never rendered
    // by this theme.
    expect(render().textContent).toContain('@astrogram');
  });
});
