import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ imports: [FooterComponent] });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should link the DB Astro Suite name to the suite home page', () => {
    const link = render().querySelector('.brand-link') as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('DB ASTRO SUITE');
    expect(link?.getAttribute('href')).toBe('https://dbastrosuite.com/');
  });

  it('should say the suite is free software under the AGPL-3.0 with a link to the license', () => {
    const root = render();
    const copyright = root.querySelector('.copyright')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(copyright).toBe('© 2026 DB ASTRO SUITE · FREE SOFTWARE UNDER AGPL-3.0');
    expect(copyright).not.toContain('ALL RIGHTS RESERVED');

    const license = root.querySelector('.license-link') as HTMLAnchorElement | null;
    expect(license?.getAttribute('href')).toBe(
      'https://github.com/sidthesloth92/db-astro-suite/blob/main/LICENSE',
    );
    expect(license?.getAttribute('target')).toBe('_blank');
  });
});
