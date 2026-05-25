import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BottomNavComponent } from './bottom-nav.component';
import type { BottomNavItem } from './bottom-nav.model';

@Component({
  standalone: true,
  imports: [BottomNavComponent],
  template: `
    <dba-ui-bottom-nav
      [items]="items"
      [activeId]="activeId()"
      (activate)="onActivate($event)"
    />
  `,
})
class HostComponent {
  readonly items: readonly BottomNavItem[] = [
    { id: 'info', label: 'Info' },
    { id: 'cap', label: 'Capture' },
    { id: 'style', label: 'Style' },
  ];
  readonly activeId = signal('cap');
  readonly emitted: string[] = [];
  onActivate(id: string): void {
    this.emitted.push(id);
  }
}

describe('BottomNavComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  it('should render one button per item with the label and aria-selected on the active one', () => {
    const f = fixture();
    const buttons = (f.nativeElement as HTMLElement).querySelectorAll('.nav-btn');
    expect(buttons.length).toBe(3);
    expect(buttons[1].getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].querySelector('.label')?.textContent?.trim()).toBe('Capture');
    expect(buttons[1].querySelector('.dot')).not.toBeNull();
  });

  it('should emit the tapped id every time, including re-taps on the active item', () => {
    const f = fixture();
    const buttons = (f.nativeElement as HTMLElement).querySelectorAll('.nav-btn');
    (buttons[2] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    expect(f.componentInstance.emitted).toEqual(['style', 'cap', 'cap']);
  });
});
