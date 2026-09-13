import { TestBed } from '@angular/core/testing';
import { RingedPlanetThemeComponent } from './ringed-planet-theme.component';

/** Renders the component against the default `CardDataService` document. */
function render(): HTMLElement {
  TestBed.configureTestingModule({ imports: [RingedPlanetThemeComponent] });
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

  it('should credit the author on the card', () => {
    // The author is collected by the Object Info panel but was never rendered
    // by this theme.
    expect(render().textContent).toContain('@astrogram');
  });
});
