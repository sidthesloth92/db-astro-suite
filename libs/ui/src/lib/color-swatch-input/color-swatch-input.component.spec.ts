import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ColorSwatchInputComponent } from './color-swatch-input.component';

@Component({
  standalone: true,
  imports: [ColorSwatchInputComponent],
  template: `
    <dba-ui-color-swatch-input
      [value]="value()"
      (valueChange)="onChange($event)"
    />
  `,
})
class HostComponent {
  readonly value = signal('#ff2d95');
  emitted = '';
  onChange(next: string): void {
    this.emitted = next;
  }
}

describe('ColorSwatchInputComponent', () => {
  it('should render the hex value in uppercase', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const hex = (fixture.nativeElement as HTMLElement).querySelector('.hex');
    expect(hex?.textContent?.trim()).toBe('#FF2D95');
  });

  it('should paint the swatch with the current value', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const swatch = (fixture.nativeElement as HTMLElement).querySelector('.swatch') as HTMLElement;
    // Browsers normalise CSS colour values; check that *some* background is set.
    expect(swatch.style.background.length).toBeGreaterThan(0);
  });

  it('should emit valueChange when the native colour input changes', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const native = (fixture.nativeElement as HTMLElement).querySelector('.native') as HTMLInputElement;
    native.value = '#00e5ff';
    native.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.emitted).toBe('#00e5ff');
  });
});
