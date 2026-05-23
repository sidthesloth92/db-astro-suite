import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextButtonComponent } from './text-button.component';

@Component({
  standalone: true,
  imports: [TextButtonComponent],
  template: `
    <dba-ui-text-button
      [label]="label"
      [variant]="variant"
      [disabled]="disabled"
      (clicked)="onClick()"
    />
  `,
})
class HostComponent {
  label = 'Launch';
  variant: 'primary' | 'secondary' = 'primary';
  disabled = false;
  clicks = 0;
  onClick(): void {
    this.clicks += 1;
  }
}

describe('TextButtonComponent', () => {
  it('renders the projected label inside the button', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(btn?.textContent?.trim()).toContain('Launch');
    expect(btn?.getAttribute('data-variant')).toBe('primary');
  });

  it('emits clicked when the user activates the button', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    btn?.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('does not emit when disabled', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    btn?.click();
    expect(fixture.componentInstance.clicks).toBe(0);
  });

  it('reflects the secondary variant on the host attribute', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'secondary';
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(btn?.getAttribute('data-variant')).toBe('secondary');
  });
});
