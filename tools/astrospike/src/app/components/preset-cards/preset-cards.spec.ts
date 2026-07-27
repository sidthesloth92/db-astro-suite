import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SPIKE_PRESETS } from '../../constants/spike-presets.constants';
import { SpikePresetId } from '../../models/spike-preset.model';
import { PresetCards } from './preset-cards';

describe('PresetCards', () => {
  let fixture: ComponentFixture<PresetCards>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [PresetCards] });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(PresetCards);
    fixture.componentRef.setInput('activeId', 'classic');
    fixture.detectChanges();
  });

  function cards(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button[role="radio"]'));
  }

  function cardFor(id: SpikePresetId): HTMLButtonElement {
    const label = SPIKE_PRESETS[id].label;
    const match = cards().find((card) => card.textContent?.includes(label));
    if (match === undefined) {
      throw new Error(`card for preset "${id}" not rendered`);
    }
    return match;
  }

  it('should render one card per preset inside a labelled radio group', () => {
    const group: HTMLElement | null = fixture.nativeElement.querySelector('[role="radiogroup"]');
    expect(group?.getAttribute('aria-label')).toBe('Spike preset');
    expect(cards().length).toBe(3);
  });

  it('should show each preset name and description', () => {
    const text: string = fixture.nativeElement.textContent;
    for (const id of ['subtle', 'classic', 'jwst'] as const) {
      expect(text).toContain(SPIKE_PRESETS[id].label);
      expect(text).toContain(SPIKE_PRESETS[id].description);
    }
  });

  it('should hint the arm count of each preset', () => {
    expect(cardFor('classic').textContent).toContain('4 arms');
    expect(cardFor('jwst').textContent).toContain('6 arms');
  });

  it('should mark only the active preset as checked', () => {
    expect(cardFor('classic').getAttribute('aria-checked')).toBe('true');
    expect(cardFor('subtle').getAttribute('aria-checked')).toBe('false');
    expect(cardFor('jwst').getAttribute('aria-checked')).toBe('false');
  });

  it('should move the checked state when the active preset changes', () => {
    fixture.componentRef.setInput('activeId', 'jwst');
    fixture.detectChanges();

    expect(cardFor('jwst').getAttribute('aria-checked')).toBe('true');
    expect(cardFor('classic').getAttribute('aria-checked')).toBe('false');
  });

  it('should emit the preset id when a card is clicked', () => {
    const selected: SpikePresetId[] = [];
    fixture.componentInstance.presetSelected.subscribe((id) => selected.push(id));

    cardFor('jwst').click();
    cardFor('subtle').click();

    expect(selected).toEqual(['jwst', 'subtle']);
  });
});
