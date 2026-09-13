import { TestBed } from '@angular/core/testing';
import { ConstellationThemeComponent } from './constellation-theme.component';

/** Renders the component against the default `CardDataService` document. */
function render(): HTMLElement {
  TestBed.configureTestingModule({ imports: [ConstellationThemeComponent] });
  const fixture = TestBed.createComponent(ConstellationThemeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ConstellationThemeComponent', () => {
  it('should render the object name in the hero name-plate', () => {
    const el = render();
    const hero = el.querySelector('[data-testid="card-hero"]');
    expect(hero).toBeTruthy();
    expect(hero?.textContent).toContain('Rosette Nebula');
  });

  it('should light one band star per enabled integration band', () => {
    const el = render();
    const bandLabels = el.querySelectorAll('.con-band-label');
    expect(bandLabels.length).toBe(3);
    expect(el.textContent).toContain('OIII');
  });

  it('should credit the author on the card', () => {
    // The author is collected by the Object Info panel but was never rendered
    // by this theme.
    expect(render().textContent).toContain('@astrogram');
  });
});
