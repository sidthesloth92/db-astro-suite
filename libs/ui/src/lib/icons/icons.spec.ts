import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApertureIconComponent } from './aperture.icon.component';
import { ChevronRightIconComponent } from './chevron-right.icon.component';
import { CloseIconComponent } from './close.icon.component';
import { DownloadIconComponent } from './download.icon.component';
import { LayersIconComponent } from './layers.icon.component';
import { MountainIconComponent } from './mountain.icon.component';
import { StarsIconComponent } from './stars.icon.component';

/**
 * Sanity check across a representative subset of the icon set:
 * - line icons render `fill="none"`
 * - solid icons render `fill="currentColor"`
 * - the `size` input drives the rendered `width` / `height` attributes
 */
@Component({
  standalone: true,
  imports: [DownloadIconComponent],
  template: `<dba-ui-icon-download [size]="32" />`,
})
class HostDownloadComponent {}

describe('Icon components', () => {
  function setupStandalone<T>(type: Type<T>): ComponentFixture<T> {
    TestBed.configureTestingModule({ imports: [type] });
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    return fixture;
  }

  it('should render a line icon (Download) with fill="none" and stroke="currentColor"', () => {
    const fixture = setupStandalone(DownloadIconComponent);
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('should default size to 16 and stroke-width to 1.5', () => {
    const fixture = setupStandalone(ChevronRightIconComponent);
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
  });

  it('should honour the size input when bound from a host', () => {
    TestBed.configureTestingModule({ imports: [HostDownloadComponent] });
    const fixture = TestBed.createComponent(HostDownloadComponent);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  // Each entry is a plain `Type<unknown>` — the spec only ever queries
  // rendered SVG attributes, never the component instance.
  const solidIcons: { name: string; type: Type<unknown> }[] = [
    { name: 'Mountain', type: MountainIconComponent },
    { name: 'Stars', type: StarsIconComponent },
    { name: 'Layers', type: LayersIconComponent },
  ];

  for (const { name, type } of solidIcons) {
    it(`should render the solid ${name} icon with fill="currentColor"`, () => {
      const fixture = setupStandalone(type);
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
      expect(svg.getAttribute('fill')).toBe('currentColor');
    });
  }

  it('should set aria-hidden on the icon host so screen readers skip it', () => {
    const fixture = setupStandalone(CloseIconComponent);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('should render multiple path elements for a multi-stroke icon (Aperture)', () => {
    const fixture = setupStandalone(ApertureIconComponent);
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    const drawables = svg.querySelectorAll('path, circle');
    expect(drawables.length).toBeGreaterThan(2);
  });
});
