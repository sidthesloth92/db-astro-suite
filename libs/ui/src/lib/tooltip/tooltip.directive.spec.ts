import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipDirective } from './tooltip.directive';

@Component({
  standalone: true,
  imports: [TooltipDirective],
  template: `<button [dbaTooltip]="text" [tooltipDelay]="0">hover me</button>`,
})
class HostComponent {
  text = 'Cigar Galaxy\nM 82 · NGC 3034';
}

/** The single tooltip element the directive mounts on <body>, if any. */
function tipEl(): HTMLElement | null {
  return document.querySelector('[role="tooltip"]');
}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let button: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('[role="tooltip"]').forEach((e) => e.remove());
  });

  it('shows a tooltip with the bound (multi-line) text on hover', (done) => {
    button.dispatchEvent(new MouseEvent('mouseenter'));
    setTimeout(() => {
      const tip = tipEl();
      expect(tip).not.toBeNull();
      expect(tip?.textContent).toBe('Cigar Galaxy\nM 82 · NGC 3034');
      done();
    }, 10);
  });

  it('removes the tooltip on mouseleave', (done) => {
    button.dispatchEvent(new MouseEvent('mouseenter'));
    setTimeout(() => {
      expect(tipEl()).not.toBeNull();
      button.dispatchEvent(new MouseEvent('mouseleave'));
      expect(tipEl()).toBeNull();
      done();
    }, 10);
  });

  it('does not show a tooltip when the text is empty', (done) => {
    fixture.componentInstance.text = '   ';
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('mouseenter'));
    setTimeout(() => {
      expect(tipEl()).toBeNull();
      done();
    }, 10);
  });
});
