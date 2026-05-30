import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TopBarComponent } from './top-bar.component';

@Component({
  standalone: true,
  imports: [TopBarComponent],
  template: `
    <dba-ui-top-bar>
      <span slot="brand" class="brand-content">astrogram</span>
      <span slot="tabs" class="tabs-content">tabs</span>
      <span slot="actions" class="actions-content">export</span>
    </dba-ui-top-bar>
  `,
})
class HostComponent {}

describe('TopBarComponent', () => {
  it('should project content into the brand / tabs / actions slots', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.brand .brand-content')?.textContent).toBe('astrogram');
    expect(root.querySelector('.tabs .tabs-content')?.textContent).toBe('tabs');
    expect(root.querySelector('.actions .actions-content')?.textContent).toBe('export');
  });
});
