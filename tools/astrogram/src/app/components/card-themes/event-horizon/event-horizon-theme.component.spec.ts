import { TestBed } from '@angular/core/testing';
import { CardDataService } from '../../../services/card-data.service';
import { EventHorizonThemeComponent } from './event-horizon-theme.component';

/** Renders the theme, optionally with every filter enabled. */
function render(allFilters = false): HTMLElement {
  TestBed.configureTestingModule({ imports: [EventHorizonThemeComponent] });
  if (allFilters) {
    TestBed.inject(CardDataService).cardData.update((card) => ({
      ...card,
      filters: card.filters.map((filter) => ({ ...filter, enabled: true })),
    }));
  }
  const fixture = TestBed.createComponent(EventHorizonThemeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('EventHorizonThemeComponent', () => {
  it('should render the object name in the hero title', () => {
    expect(render().querySelector('[data-testid="card-hero"]')?.textContent).toContain('Rosette Nebula');
  });

  it('should keep a short legend on one row', () => {
    const el = render();
    expect(el.querySelectorAll('.eh-legend-item').length).toBe(3);
    expect(el.querySelector('.eh-legend-break')).toBeNull();
  });

  it('should split a seven-band legend into rows of four and three', () => {
    const el = render(true);
    const legend = el.querySelector('.eh-legend');
    const children = Array.from(legend?.children ?? []);
    const breakAt = children.findIndex((child) => child.classList.contains('eh-legend-break'));

    expect(el.querySelectorAll('.eh-legend-item').length).toBe(7);
    expect(breakAt).toBe(4);
  });
});
