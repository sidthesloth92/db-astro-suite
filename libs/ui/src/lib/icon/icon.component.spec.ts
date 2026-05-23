import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';
import { IconDefinition } from './icon-definition';

const lineIcon: IconDefinition = {
  name: 'line-test',
  body: '<path d="M12 3v12" />',
};

const solidIcon: IconDefinition = {
  name: 'solid-test',
  fill: 'currentColor',
  body: '<path d="m8 3 4 8 5-5 5 15H2L8 3z" />',
};

const customViewBoxIcon: IconDefinition = {
  name: 'custom-view-box',
  viewBox: '0 0 32 32',
  body: '<rect x="0" y="0" width="32" height="32" />',
};

@Component({
  standalone: true,
  imports: [IconComponent],
  template: `<dba-ui-icon [def]="def" [size]="size" [strokeWidth]="strokeWidth" />`,
})
class HostComponent {
  def: IconDefinition = lineIcon;
  size = 16;
  strokeWidth = 1.5;
}

describe('IconComponent', () => {
  function host(): ComponentFixture<HostComponent> {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should render an svg with the correct size and stroke-width attrs', () => {
    const fixture = host();
    fixture.componentInstance.size = 24;
    fixture.componentInstance.strokeWidth = 2;
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
    expect(svg.getAttribute('stroke-width')).toBe('2');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
  });

  it('should default size to 16 and stroke-width to 1.5', () => {
    const fixture = host();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
  });

  it('should default fill to "none" for line icons', () => {
    const fixture = host();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('fill')).toBe('none');
  });

  it('should respect a custom fill of "currentColor" for solid icons', () => {
    const fixture = host();
    fixture.componentInstance.def = solidIcon;
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('fill')).toBe('currentColor');
  });

  it('should default viewBox to "0 0 24 24"', () => {
    const fixture = host();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('should respect a custom viewBox', () => {
    const fixture = host();
    fixture.componentInstance.def = customViewBoxIcon;
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('viewBox')).toBe('0 0 32 32');
  });

  it('should render the icon body via sanitized innerHTML', () => {
    const fixture = host();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    // The body string contains a single <path d="M12 3v12" /> drawable.
    expect(svg.innerHTML).toContain('M12 3v12');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('should set aria-hidden on the icon host so screen readers skip it', () => {
    const fixture = host();
    const iconHost = fixture.nativeElement.querySelector('dba-ui-icon') as HTMLElement;
    expect(iconHost.getAttribute('aria-hidden')).toBe('true');
  });
});
