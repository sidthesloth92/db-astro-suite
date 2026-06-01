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

/** Simulates a touch tap on the host (pointerdown(touch) then the click it emits). */
function tap(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
  el.dispatchEvent(new MouseEvent('click'));
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

  it('shows a tooltip with the bound (multi-line) text on mouse hover', (done) => {
    button.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    setTimeout(() => {
      const tip = tipEl();
      expect(tip).not.toBeNull();
      expect(tip?.textContent).toBe('Cigar Galaxy\nM 82 · NGC 3034');
      done();
    }, 10);
  });

  it('removes the tooltip when the mouse leaves', (done) => {
    button.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    setTimeout(() => {
      expect(tipEl()).not.toBeNull();
      button.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      expect(tipEl()).toBeNull();
      done();
    }, 10);
  });

  it('does not show on a touch pointer entering — touch has no hover', (done) => {
    button.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    setTimeout(() => {
      expect(tipEl()).toBeNull();
      done();
    }, 10);
  });

  it('shows the tooltip on a touch tap — the mobile affordance', () => {
    tap(button);
    expect(tipEl()).not.toBeNull();
  });

  it('toggles the tooltip off on a second touch tap', () => {
    tap(button);
    expect(tipEl()).not.toBeNull();
    tap(button);
    expect(tipEl()).toBeNull();
  });

  it('dismisses an open tapped tooltip when interacting outside the host', () => {
    tap(button);
    expect(tipEl()).not.toBeNull();
    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
    expect(tipEl()).toBeNull();
  });

  it('does not open on a mouse click — desktop relies on hover, not click', () => {
    button.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));
    button.dispatchEvent(new MouseEvent('click'));
    expect(tipEl()).toBeNull();
  });

  it('does not show a tooltip when the text is empty', () => {
    fixture.componentInstance.text = '   ';
    fixture.detectChanges();
    tap(button);
    expect(tipEl()).toBeNull();
  });
});
