import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProgressRingComponent } from './progress-ring.component';

@Component({
  standalone: true,
  imports: [ProgressRingComponent],
  template: `
    <dba-ui-progress-ring
      [value]="50"
      [total]="100"
      [color]="'var(--db-color-cyan)'"
      [label]="'OIII'"
      [centerText]="'2h 40m'"
    />
  `,
})
class HostComponent {}

describe('ProgressRingComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should render the centre text and label', () => {
    const root = createFixture().nativeElement as HTMLElement;
    expect(root.querySelector('.center')?.textContent?.trim()).toBe('2h 40m');
    expect(root.querySelector('.label')?.textContent?.trim()).toBe('OIII');
  });

  it('should set the arc dashoffset to half the circumference for value=50/total=100', () => {
    const root = createFixture().nativeElement as HTMLElement;
    const arc = root.querySelector('.arc') as SVGCircleElement;
    const dasharray = Number.parseFloat(arc.getAttribute('stroke-dasharray') ?? '0');
    const offset = Number.parseFloat(arc.getAttribute('stroke-dashoffset') ?? '0');
    // 2 * PI * 28 ≈ 175.93; half-fill should leave offset ≈ 87.96
    expect(dasharray).toBeGreaterThan(0);
    expect(offset / dasharray).toBeCloseTo(0.5, 2);
  });

  it('should pass the color input through as the arc stroke', () => {
    const root = createFixture().nativeElement as HTMLElement;
    const arc = root.querySelector('.arc') as SVGCircleElement;
    expect(arc.getAttribute('stroke')).toBe('var(--db-color-cyan)');
  });
});
