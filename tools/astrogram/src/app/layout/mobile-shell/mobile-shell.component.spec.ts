import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardDataService } from '../../services/card-data.service';
import { MobileShellComponent } from './mobile-shell.component';

/**
 * Behaviour tests for the mobile shell's stellar-section selection logic.
 * The template is overridden to empty so the heavy child panels are not
 * instantiated — these assert the component's public signals/handlers.
 */
describe('MobileShellComponent (stellar section selection)', () => {
  let dataStub: {
    activeMode: ReturnType<typeof signal<'infographic' | 'stellar-map'>>;
    selectedAnnotationId: ReturnType<typeof signal<string | null>>;
  };

  beforeEach(async () => {
    dataStub = {
      activeMode: signal<'infographic' | 'stellar-map'>('stellar-map'),
      selectedAnnotationId: signal<string | null>(null),
    };
    await TestBed.configureTestingModule({
      imports: [MobileShellComponent],
      providers: [{ provide: CardDataService, useValue: dataStub }],
    })
      .overrideComponent(MobileShellComponent, { set: { template: '' } })
      .compileComponents();
  });

  function create(): MobileShellComponent {
    return TestBed.createComponent(MobileShellComponent).componentInstance;
  }

  it('has no stellar section selected by default', () => {
    const cmp = create();
    expect(cmp.stellarSection()).toBeNull();
  });

  it('does not highlight any bottom-nav item before the user picks one', () => {
    const cmp = create();
    expect(cmp.activeStellarRailId()).toBe('');
  });

  it('keeps the sheet collapsed by default', () => {
    const cmp = create();
    expect(cmp.sheetExpanded()).toBe(false);
  });

  it('selects + expands only after the user taps a section', () => {
    const cmp = create();
    cmp.onStellarActivate('filters');
    expect(cmp.stellarSection()).toBe('filters');
    expect(cmp.activeStellarRailId()).toBe('filters');
    expect(cmp.sheetExpanded()).toBe(true);
  });

  it('collapses the sheet when switching modes', () => {
    const cmp = create();
    cmp.onStellarActivate('filters');
    expect(cmp.sheetExpanded()).toBe(true);
    cmp.onModeChange('infographic');
    expect(cmp.sheetExpanded()).toBe(false);
  });

  it('highlights "selected" when an annotation is selected, without a prior pick', () => {
    const cmp = create();
    dataStub.selectedAnnotationId.set('ann-1');
    expect(cmp.activeStellarRailId()).toBe('selected');
  });
});
