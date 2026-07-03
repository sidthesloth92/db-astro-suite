import { TestBed } from '@angular/core/testing';
import { OrreryThemeComponent } from './orrery-theme.component';

/** Renders the component against the default `CardDataService` document. */
function render(): HTMLElement {
  TestBed.configureTestingModule({ imports: [OrreryThemeComponent] });
  const fixture = TestBed.createComponent(OrreryThemeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('OrreryThemeComponent', () => {
  it('should render the object name in the hero title', () => {
    const el = render();
    const hero = el.querySelector('[data-testid="card-hero"]');
    expect(hero).toBeTruthy();
    expect(hero?.textContent).toContain('Rosette Nebula');
  });

  it('should orbit one planet per enabled integration band', () => {
    const el = render();
    const planetLabels = el.querySelectorAll('.orr-planet-label');
    expect(planetLabels.length).toBe(3);
    expect(el.textContent).toContain('OIII');
  });
});
