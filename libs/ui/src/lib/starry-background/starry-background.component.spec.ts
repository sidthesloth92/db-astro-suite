import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StarryBackgroundComponent } from './starry-background.component';

@Component({
  standalone: true,
  imports: [StarryBackgroundComponent],
  template: `
    <dba-ui-starry-background>
      <p class="child">hello</p>
    </dba-ui-starry-background>
  `,
})
class HostComponent {}

describe('StarryBackgroundComponent', () => {
  it('should render the star layer and project children above it', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.stars')).not.toBeNull();
    expect(root.querySelector('.content .child')?.textContent).toBe('hello');
    // The star field must be marked aria-hidden so it doesn't pollute the AOM.
    expect(root.querySelector('.stars')?.getAttribute('aria-hidden')).toBe('true');
  });
});
