import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwitchComponent } from './switch.component';

@Component({
  standalone: true,
  imports: [SwitchComponent],
  template: `
    <dba-ui-switch
      [checked]="checked()"
      [ariaLabel]="'Enable filter'"
      (checkedChange)="onChange($event)"
    />
  `,
})
class HostComponent {
  readonly checked = signal(false);
  readonly emitted: boolean[] = [];
  onChange(next: boolean): void {
    this.emitted.push(next);
  }
}

describe('SwitchComponent', () => {
  it('should render with role=switch and the given aria-label', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('role')).toBe('switch');
    expect(button?.getAttribute('aria-label')).toBe('Enable filter');
    expect(button?.getAttribute('aria-checked')).toBe('false');
  });

  it('should emit the inverted state when toggled', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    button?.click();
    expect(fixture.componentInstance.emitted).toEqual([true]);
  });

  it('should reflect the checked input in aria-checked and the is-on class', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-checked')).toBe('true');
    expect(button?.classList.contains('is-on')).toBe(true);
  });
});
