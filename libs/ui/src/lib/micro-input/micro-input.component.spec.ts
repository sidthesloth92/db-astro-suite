import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MicroInputComponent } from './micro-input.component';

@Component({
  standalone: true,
  imports: [MicroInputComponent],
  template: `
    <dba-ui-micro-input
      [value]="value()"
      [mono]="true"
      [prefix]="'@'"
      [suffix]="'ly'"
      [placeholder]="'name'"
      (valueChange)="onChange($event)"
    />
  `,
})
class HostComponent {
  readonly value = signal('astrogram');
  emitted = '';
  onChange(next: string): void {
    this.emitted = next;
  }
}

describe('MicroInputComponent', () => {
  it('should render the value, prefix, and suffix', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input');
    expect(input?.value).toBe('astrogram');
    expect(input?.classList.contains('is-mono')).toBe(true);
    expect(root.querySelector('.prefix')?.textContent?.trim()).toBe('@');
    expect(root.querySelector('.suffix')?.textContent?.trim()).toBe('ly');
  });

  it('should emit valueChange when the user types', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    if (input) {
      input.value = 'rosette';
      input.dispatchEvent(new Event('input'));
    }
    expect(fixture.componentInstance.emitted).toBe('rosette');
  });
});
