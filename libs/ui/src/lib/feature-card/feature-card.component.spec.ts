import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FeatureCardComponent } from './feature-card.component';

@Component({
  standalone: true,
  imports: [FeatureCardComponent],
  template: `
    <dba-ui-feature-card [heading]="'Stack & Align'" [body]="'Frames stacked automatically.'">
      <svg class="glyph"></svg>
    </dba-ui-feature-card>
  `,
})
class HostComponent {}

describe('FeatureCardComponent', () => {
  it('should render the heading, body, and projected icon', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.fc__heading')?.textContent?.trim()).toBe('Stack & Align');
    expect(root.querySelector('.fc__body')?.textContent?.trim()).toBe(
      'Frames stacked automatically.',
    );
    expect(root.querySelector('.fc__icon .glyph')).not.toBeNull();
  });
});
