import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FitTextDirective } from './fit-text.directive';

/** Hosts a fitted heading inside a box of a controllable width. */
@Component({
  standalone: true,
  imports: [FitTextDirective],
  template: `
    <div [style.width.px]="width()" style="font-family: monospace">
      <div class="title" [dbaAgFitText]="40" [fitTextMin]="10" [fitTextContent]="text()">
        {{ text() }}
      </div>
    </div>
  `,
})
class FitTextHostComponent {
  readonly width = signal(600);
  readonly text = signal('M31');
}

describe('FitTextDirective', () => {
  let fixture: ComponentFixture<FitTextHostComponent>;
  let title: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FitTextHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(FitTextHostComponent);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
    await fixture.whenStable();
    title = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.title') as HTMLElement;
  });

  afterEach(() => {
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('should keep a short name at its designed size', () => {
    expect(title.style.fontSize).toBe('40px');
    expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
  });

  it('should shrink a long name onto one line that fits the box', async () => {
    fixture.componentInstance.text.set('North America and Pelican Nebula Complex');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(parseFloat(title.style.fontSize)).toBeLessThan(40);
    expect(title.style.whiteSpace).toBe('nowrap');
    expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
  });

  it('should wrap rather than clip when even the minimum size is too wide', async () => {
    fixture.componentInstance.width.set(60);
    fixture.componentInstance.text.set('North America and Pelican Nebula Complex');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(title.style.fontSize).toBe('10px');
    expect(title.style.whiteSpace).toBe('normal');
  });
});
