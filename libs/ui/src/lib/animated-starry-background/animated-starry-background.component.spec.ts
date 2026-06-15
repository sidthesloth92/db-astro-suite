import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnimatedStarryBackgroundComponent } from './animated-starry-background.component';

@Component({
  standalone: true,
  imports: [AnimatedStarryBackgroundComponent],
  template: `
    <dba-ui-animated-starry-background>
      <p class="child">hello</p>
    </dba-ui-animated-starry-background>
  `,
})
class HostComponent {}

describe('AnimatedStarryBackgroundComponent', () => {
  it('should render the canvas backdrop and project children above it', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const canvas = root.querySelector('canvas.sky');
    expect(canvas).not.toBeNull();
    // The backdrop must be aria-hidden so it doesn't pollute the AOM.
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.content .child')?.textContent).toBe('hello');
  });
});
