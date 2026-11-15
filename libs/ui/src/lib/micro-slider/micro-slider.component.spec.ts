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

@Component({
  standalone: true,
  imports: [MicroSliderComponent],
  template: `<dba-ui-micro-slider [value]="value()" [min]="-10" [max]="10" [fillFrom]="0" />`,
})
class TwoWayHostComponent {
  readonly value = signal(0);
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

  it('should fill the whole track from the minimum and show no tick by default', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const fill = host.querySelector('.fill') as HTMLElement;
    expect(fill.style.left).toBe('0%');
    expect(host.querySelector('.origin')).toBeNull();
  });

  describe('with a resting point inside the range', () => {
    function create(value: number): HTMLElement {
      TestBed.configureTestingModule({ imports: [TwoWayHostComponent] });
      const fixture = TestBed.createComponent(TwoWayHostComponent);
      fixture.componentInstance.value.set(value);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('should mark the resting point and fill nothing while the handle rests on it', () => {
      const host = create(0);
      expect((host.querySelector('.origin') as HTMLElement).style.left).toBe('50%');
      expect((host.querySelector('.dot') as HTMLElement).style.left).toBe('50%');
      expect((host.querySelector('.fill') as HTMLElement).style.width).toBe('0%');
    });

    it('should fill from the resting point to a handle on its right', () => {
      const fill = create(5).querySelector('.fill') as HTMLElement;
      expect(fill.style.left).toBe('50%');
      expect(fill.style.width).toBe('25%');
    });

    it('should fill from a handle on its left back to the resting point', () => {
      const host = create(-10);
      const fill = host.querySelector('.fill') as HTMLElement;
      expect(fill.style.left).toBe('0%');
      expect(fill.style.width).toBe('50%');
      expect((host.querySelector('.dot') as HTMLElement).style.left).toBe('0%');
    });
  });
});
