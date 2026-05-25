import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MicroSliderComponent } from './micro-slider.component';

@Component({
  standalone: true,
  imports: [MicroSliderComponent],
  template: `
    <dba-ui-micro-slider
      [value]="value()"
      [min]="0"
      [max]="100"
      [suffix]="'%'"
      (valueChange)="onChange($event)"
    />
  `,
})
class HostComponent {
  readonly value = signal(40);
  emitted: number | null = null;
  onChange(next: number): void {
    this.emitted = next;
  }
}

describe('MicroSliderComponent', () => {
  it('should render the readout with the value and suffix', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const readout = (fixture.nativeElement as HTMLElement).querySelector('.readout');
    expect(readout?.textContent?.trim()).toBe('40%');
  });

  it('should size the filled track proportionally to the value', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const fill = (fixture.nativeElement as HTMLElement).querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('40%');
  });

  it('should emit valueChange with the parsed number when the user drags', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const native = (fixture.nativeElement as HTMLElement).querySelector('.native') as HTMLInputElement;
    native.value = '72';
    native.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.emitted).toBe(72);
  });

  it('should clamp the rendered percent to 0–100 even when value exceeds the range', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(200);
    fixture.detectChanges();
    const fill = (fixture.nativeElement as HTMLElement).querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
