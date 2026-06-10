import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SplitButtonComponent } from './split-button.component';
import { SplitButtonMenuItem } from './split-button.model';

@Component({
  standalone: true,
  imports: [SplitButtonComponent],
  template: `
    <dba-ui-split-button
      [label]="'Start Recording'"
      [menuItems]="items"
      [selectedValue]="selected()"
      [menuDisabled]="menuDisabled()"
      (mainClick)="mainClicks = mainClicks + 1"
      (menuSelect)="onSelect($event)"
    />
  `,
})
class HostComponent {
  readonly items: readonly SplitButtonMenuItem[] = [
    { value: 'a', label: 'Option A', description: 'First option', detail: '~47 MB' },
    { value: 'b', label: 'Option B' },
  ];
  readonly selected = signal('a');
  readonly menuDisabled = signal(false);
  mainClicks = 0;
  readonly selections: string[] = [];
  onSelect(value: string): void {
    this.selections.push(value);
  }
}

describe('SplitButtonComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function query<T extends HTMLElement>(fixture: { nativeElement: HTMLElement }, sel: string) {
    return fixture.nativeElement.querySelector(sel) as T | null;
  }

  it('should render the label and emit mainClick when the main segment is pressed', () => {
    const fixture = createFixture();
    const main = query<HTMLButtonElement>(fixture, '.segment.main');
    expect(main?.textContent?.trim()).toBe('Start Recording');
    main?.click();
    expect(fixture.componentInstance.mainClicks).toBe(1);
  });

  it('should open the menu from the chevron and mark the selected item checked', () => {
    const fixture = createFixture();
    expect(query(fixture, '.menu')).toBeNull();
    query<HTMLButtonElement>(fixture, '.segment.chevron')?.click();
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.menu-item');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    expect(rows[1].getAttribute('aria-checked')).toBe('false');
    expect(rows[0].textContent).toContain('~47 MB');
  });

  it('should emit menuSelect with the item value and close the menu', () => {
    const fixture = createFixture();
    query<HTMLButtonElement>(fixture, '.segment.chevron')?.click();
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.menu-item');
    (rows[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selections).toEqual(['b']);
    expect(query(fixture, '.menu')).toBeNull();
  });

  it('should disable only the chevron segment when menuDisabled is set', () => {
    const fixture = createFixture();
    fixture.componentInstance.menuDisabled.set(true);
    fixture.detectChanges();
    expect(query<HTMLButtonElement>(fixture, '.segment.main')?.disabled).toBeFalse();
    expect(query<HTMLButtonElement>(fixture, '.segment.chevron')?.disabled).toBeTrue();
  });

  it('should close the menu when Escape is pressed', () => {
    const fixture = createFixture();
    query<HTMLButtonElement>(fixture, '.segment.chevron')?.click();
    fixture.detectChanges();
    expect(query(fixture, '.menu')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(query(fixture, '.menu')).toBeNull();
  });
});
