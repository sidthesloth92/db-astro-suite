import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SPIKE_PRESETS, SPIKE_PRESET_ORDER } from '../../constants/spike-presets.constants';
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

  /** The trigger row naming the active preset. */
  function trigger(): HTMLButtonElement {
    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('button.preset-trigger');
    if (button === null) {
      throw new Error('preset trigger not rendered');
    }
    return button;
  }

  /** Opens the menu and returns its options. */
  function options(): HTMLButtonElement[] {
    if (fixture.nativeElement.querySelector('.preset-menu') === null) {
      trigger().click();
      fixture.detectChanges();
    }
    return Array.from(fixture.nativeElement.querySelectorAll('button[role="option"]'));
  }

  function cardFor(id: SpikePresetId): HTMLButtonElement {
    const label = SPIKE_PRESETS[id].label;
    const match = options().find((option) => option.textContent?.includes(label));
    if (match === undefined) {
      throw new Error(`option for preset "${id}" not rendered`);
    }
    return match;
  }

  it('should name the active preset on a collapsed trigger', () => {
    // Closed by default: the choice is made once, while the sliders below it are
    // worked constantly, so it does not get to own the space permanently.
    expect(fixture.nativeElement.querySelector('.preset-menu')).toBeNull();
    expect(trigger().textContent).toContain('Classic');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('should offer one option per preset once expanded', () => {
    const list: HTMLElement | null = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(options().length).toBe(SPIKE_PRESET_ORDER.length);
    expect(list ?? fixture.nativeElement.querySelector('[role="listbox"]')).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('should collapse the menu again after a pick', () => {
    cardFor('jwst').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preset-menu')).toBeNull();
  });

  it('should show each preset name and description once expanded', () => {
    // Collapsed, only the active preset is described — that is the point of the
    // dropdown — so the menu has to be opened before naming them all.
    options();
    const text: string = fixture.nativeElement.textContent;
    for (const id of SPIKE_PRESET_ORDER) {
      expect(text).toContain(SPIKE_PRESETS[id].label);
      expect(text).toContain(SPIKE_PRESETS[id].description);
    }
  });

  it('should hint the arm count through the glyph', () => {
    // The glyph has as many points as the preset has arms, so it states the
    // preset rather than decorating it.
    const paths = (id: SpikePresetId): string =>
      cardFor(id).querySelector('path')?.getAttribute('d') ?? '';
    expect(paths('classic')).not.toBe(paths('jwst'));
    expect(paths('classic')).toBe(paths('subtle'));
  });

  it('should mark only the active preset as checked', () => {
    expect(cardFor('classic').getAttribute('aria-selected')).toBe('true');
    expect(cardFor('subtle').getAttribute('aria-selected')).toBe('false');
    expect(cardFor('jwst').getAttribute('aria-selected')).toBe('false');
  });

  it('should move the checked state when the active preset changes', () => {
    fixture.componentRef.setInput('activeId', 'jwst');
    fixture.detectChanges();

    expect(cardFor('jwst').getAttribute('aria-selected')).toBe('true');
    expect(cardFor('classic').getAttribute('aria-selected')).toBe('false');
  });

  it('should emit the preset id when a card is clicked', () => {
    const selected: SpikePresetId[] = [];
    fixture.componentInstance.presetSelected.subscribe((id) => selected.push(id));

    cardFor('jwst').click();
    cardFor('subtle').click();

    expect(selected).toEqual(['jwst', 'subtle']);
  });
});
