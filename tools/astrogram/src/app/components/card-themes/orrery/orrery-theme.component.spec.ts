import { TestBed } from '@angular/core/testing';
import { CardDataService } from '../../../services/card-data.service';
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

  it('should credit the author on the card', () => {
    // The author is collected by the Object Info panel but was never rendered
    // by this theme.
    expect(render().textContent).toContain('@astrogram');
  });

  it('should keep every planet caption off the total at the centre with seven bands', () => {
    TestBed.configureTestingModule({ imports: [OrreryThemeComponent] });
    const data = TestBed.inject(CardDataService);
    data.cardData.update((card) => ({
      ...card,
      filters: card.filters.map((filter) => ({ ...filter, enabled: true })),
    }));
    const fixture = TestBed.createComponent(OrreryThemeComponent);
    fixture.detectChanges();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.orr-planet-label'),
    );
    expect(labels.length).toBe(7);

    // The total sits at 35% down and 50% across the 540 x 720 art box, about
    // 110 wide and 52 tall; a caption is about 64 wide and 38 tall.
    const sunTop = 252 - 26;
    const sunBottom = 252 + 26;
    for (const label of labels) {
      // A caption above its planet hangs from its top value.
      const anchor = (parseFloat(label.style.top) / 100) * 720;
      const top = label.classList.contains('orr-planet-label--above') ? anchor - 38 : anchor;
      const x = (parseFloat(label.style.left) / 100) * 540;
      const overlapsX = Math.abs(x - 270) < 55 + 32;
      const overlapsY = top < sunBottom && top + 38 > sunTop;
      expect(overlapsX && overlapsY).withContext(label.textContent ?? '').toBeFalse();
    }
  });
});
