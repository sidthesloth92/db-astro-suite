import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InspectorSectionComponent } from './inspector-section.component';

@Component({
  standalone: true,
  imports: [InspectorSectionComponent],
  template: `
    <dba-ui-inspector-section
      [title]="'Identification'"
      [sub]="'Object name & coordinates'"
    >
      <span slot="icon" class="chip-icon">i</span>
      <button slot="action" class="action-btn">Wiki</button>
      <div class="body-content">body here</div>
    </dba-ui-inspector-section>
  `,
})
class HostComponent {}

describe('InspectorSectionComponent', () => {
  it('should render title, sub, and projected icon / action / body slots', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.title')?.textContent?.trim()).toBe('Identification');
    expect(root.querySelector('.sub')?.textContent?.trim()).toBe('Object name & coordinates');
    expect(root.querySelector('.chip-icon')?.textContent).toBe('i');
    expect(root.querySelector('.action-btn')?.textContent).toBe('Wiki');
    expect(root.querySelector('.body-content')?.textContent).toBe('body here');
  });
});
