import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeGearLineComponent } from './theme-gear-line.component';

describe('ThemeGearLineComponent', () => {
  let fixture: ComponentFixture<ThemeGearLineComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ThemeGearLineComponent] }).compileComponents();
    fixture = TestBed.createComponent(ThemeGearLineComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  function render(values: readonly string[]): HTMLElement[] {
    fixture.componentRef.setInput('values', values);
    fixture.detectChanges();
    return Array.from(host.querySelectorAll<HTMLElement>('.gear-item'));
  }

  it('should print each value as its own unit so a line never breaks inside one item', () => {
    const items = render(['Askar 103 APO', 'SVBony SV106 60mm+ ASI120MM Mini']);

    expect(items.length).toBe(2);
    expect(items[1].textContent?.trim()).toBe('SVBony SV106 60mm+ ASI120MM Mini');
  });

  it('should separate items with a trailing dot on every item but the last', () => {
    const items = render(['Askar 103 APO', 'ZWO ASI2600MM Air', 'Astronomik MaxFR 6nm SHO']);

    expect(items[0].querySelector('.gear-sep')).toBeTruthy();
    expect(items[1].querySelector('.gear-sep')).toBeTruthy();
    expect(items[2].querySelector('.gear-sep')).toBeNull();
  });

  it('should render nothing for an empty list', () => {
    expect(render([]).length).toBe(0);
  });
});
