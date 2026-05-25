import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PillBadgeComponent } from './pill-badge.component';

@Component({
  standalone: true,
  imports: [PillBadgeComponent],
  template: `
    <dba-ui-pill-badge [tone]="'pink'">SHO</dba-ui-pill-badge>
    <dba-ui-pill-badge>DEFAULT</dba-ui-pill-badge>
  `,
})
class HostComponent {}

describe('PillBadgeComponent', () => {
  it('should render the projected label content', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SHO');
    expect(text).toContain('DEFAULT');
  });

  it('should apply the requested tone via the data attribute', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const pills = (fixture.nativeElement as HTMLElement).querySelectorAll('.pill');
    expect(pills[0].getAttribute('data-tone')).toBe('pink');
    expect(pills[1].getAttribute('data-tone')).toBe('cyan');
  });
});
