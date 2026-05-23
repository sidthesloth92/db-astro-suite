import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InspectorFieldComponent } from './inspector-field.component';

@Component({
  standalone: true,
  imports: [InspectorFieldComponent],
  template: `
    <dba-ui-inspector-field
      [label]="'Name'"
      [sub]="'Required'"
      [density]="'compact'"
    >
      <input class="control" value="Rosette" />
    </dba-ui-inspector-field>
  `,
})
class HostComponent {}

describe('InspectorFieldComponent', () => {
  it('should render label, sub, and the projected control', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.label')?.textContent?.trim()).toBe('Name');
    expect(root.querySelector('.sub')?.textContent?.trim()).toBe('Required');
    expect((root.querySelector('.control') as HTMLInputElement)?.value).toBe('Rosette');
  });

  it('should expose the density via data-density', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const field = (fixture.nativeElement as HTMLElement).querySelector('.field');
    expect(field?.getAttribute('data-density')).toBe('compact');
  });
});
