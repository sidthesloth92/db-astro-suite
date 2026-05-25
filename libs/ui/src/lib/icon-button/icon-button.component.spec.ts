import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconButtonComponent } from './icon-button.component';

@Component({
  standalone: true,
  imports: [IconButtonComponent],
  template: `
    <dba-ui-icon-button
      [active]="active()"
      [accent]="'cyan'"
      [title]="'Add'"
      (clicked)="onClicked()"
    >
      <span class="glyph">+</span>
    </dba-ui-icon-button>
  `,
})
class HostComponent {
  readonly active = signal(false);
  clickCount = 0;
  onClicked(): void {
    this.clickCount += 1;
  }
}

describe('IconButtonComponent', () => {
  it('should project the icon content and use the given title for a11y', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.querySelector('.glyph')?.textContent).toBe('+');
    expect(button?.getAttribute('aria-label')).toBe('Add');
    expect(button?.getAttribute('title')).toBe('Add');
  });

  it('should emit clicked when the user activates the button', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    button?.click();
    expect(host.clickCount).toBe(1);
  });

  it('should set aria-pressed when active', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;
    host.active.set(true);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.classList.contains('is-active')).toBe(true);
  });
});
