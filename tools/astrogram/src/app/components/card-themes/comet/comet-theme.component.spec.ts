import { TestBed } from '@angular/core/testing';
import { CometThemeComponent } from './comet-theme.component';

/** Renders the component against the default `CardDataService` document. */
function render(): HTMLElement {
  TestBed.configureTestingModule({ imports: [CometThemeComponent] });
  const fixture = TestBed.createComponent(CometThemeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CometThemeComponent', () => {
  it('should render the object name in the hero title', () => {
    const el = render();
    const hero = el.querySelector('[data-testid="card-hero"]');
    expect(hero).toBeTruthy();
    expect(hero?.textContent).toContain('Rosette Nebula');
  });

  it('should draw one ion streak and legend entry per enabled band', () => {
    const el = render();
    const legendItems = el.querySelectorAll('.com-legend-item');
    expect(legendItems.length).toBe(3);
    expect(el.textContent).toContain('OIII');
  });

  it('should credit the author on the card', () => {
    // The author is collected by the Object Info panel but was never rendered
    // by this theme.
    expect(render().textContent).toContain('@astrogram');
  });
});
