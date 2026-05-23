import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconRailComponent } from './icon-rail.component';
import { IconRailItemComponent } from './icon-rail-item.component';

@Component({
  standalone: true,
  imports: [IconRailComponent, IconRailItemComponent],
  template: `
    <dba-ui-icon-rail [side]="'right'">
      <dba-ui-icon-rail-item
        [id]="'object'"
        [label]="'Object info'"
        [short]="'Info'"
        [active]="active() === 'object'"
        (selected)="onSelect($event)"
      >
        <span class="g">i</span>
      </dba-ui-icon-rail-item>
      <hr />
      <dba-ui-icon-rail-item
        [id]="'style'"
        [label]="'Style'"
        [short]="'Style'"
        [active]="active() === 'style'"
        (selected)="onSelect($event)"
      >
        <span class="g">s</span>
      </dba-ui-icon-rail-item>
    </dba-ui-icon-rail>
  `,
})
class HostComponent {
  readonly active = signal('object');
  selected = '';
  onSelect(id: string): void {
    this.selected = id;
    this.active.set(id);
  }
}

describe('IconRailComponent + IconRailItemComponent', () => {
  it('should render projected items and a divider', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('dba-ui-icon-rail-item').length).toBe(2);
    expect(root.querySelector('hr')).not.toBeNull();
    expect(root.querySelector('.rail')?.getAttribute('data-side')).toBe('right');
  });

  it('should mark the active item with the is-active class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.item');
    expect(items[0].classList.contains('is-active')).toBe(true);
    expect(items[1].classList.contains('is-active')).toBe(false);
  });

  it('should emit the selected id when an item is clicked', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.item');
    (items[1] as HTMLButtonElement).click();
    expect(fixture.componentInstance.selected).toBe('style');
  });
});
