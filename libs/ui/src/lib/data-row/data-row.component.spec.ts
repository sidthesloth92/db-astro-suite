import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataRowComponent } from './data-row.component';

@Component({
  standalone: true,
  imports: [DataRowComponent],
  template: `
    <dba-ui-data-row
      [label]="'TELESCOPE'"
      [value]="'Askar 103 APO'"
      [accent]="'cyan'"
    >
      <span slot="icon" class="glyph">T</span>
    </dba-ui-data-row>
  `,
})
class HostComponent {}

describe('DataRowComponent', () => {
  it('should render the label, value, and projected icon', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.label')?.textContent?.trim()).toBe('TELESCOPE');
    expect(root.querySelector('.value')?.textContent?.trim()).toBe('Askar 103 APO');
    expect(root.querySelector('.glyph')?.textContent).toBe('T');
  });

  it('should apply the accent data attribute', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('.row');
    expect(row?.getAttribute('data-accent')).toBe('cyan');
  });
});
