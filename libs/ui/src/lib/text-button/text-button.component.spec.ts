import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TextButtonComponent, TextButtonRouterLink } from './text-button.component';

@Component({
  standalone: true,
  imports: [TextButtonComponent],
  template: `
    <dba-ui-text-button
      [label]="label"
      [variant]="variant"
      [disabled]="disabled"
      [routerLink]="routerLink"
      [href]="href"
      (clicked)="onClick($event)"
    />
  `,
})
class HostComponent {
  label = 'Launch';
  variant: 'primary' | 'secondary' = 'primary';
  disabled = false;
  routerLink: TextButtonRouterLink = null;
  href: string | null = null;
  clicks = 0;
  lastEvent: Event | null = null;
  onClick(event?: Event): void {
    this.clicks += 1;
    if (event) {
      this.lastEvent = event;
    }
  }
}

describe('TextButtonComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    });
    return TestBed.createComponent(HostComponent);
  }

  describe('button render mode (default)', () => {
    it('renders the projected label inside the button', () => {
      const fixture = createFixture();
      fixture.detectChanges();
      const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
      expect(btn?.textContent?.trim()).toContain('Launch');
      expect(btn?.getAttribute('data-variant')).toBe('primary');
    });

    it('emits clicked when the user activates the button', () => {
      const fixture = createFixture();
      fixture.detectChanges();
      const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
      btn?.click();
      expect(fixture.componentInstance.clicks).toBe(1);
    });

    it('does not emit when disabled', () => {
      const fixture = createFixture();
      fixture.componentInstance.disabled = true;
      fixture.detectChanges();
      const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
      btn?.click();
      expect(fixture.componentInstance.clicks).toBe(0);
    });

    it('reflects the secondary variant on the host attribute', () => {
      const fixture = createFixture();
      fixture.componentInstance.variant = 'secondary';
      fixture.detectChanges();
      const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
      expect(btn?.getAttribute('data-variant')).toBe('secondary');
    });
  });

  describe('routerLink render mode (internal)', () => {
    it('renders as an anchor with routerLink applied and no nested button', () => {
      const fixture = createFixture();
      fixture.componentInstance.routerLink = ['/dossier/starwizz'];
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const anchor = root.querySelector('a.text-button') as HTMLAnchorElement | null;
      expect(anchor).not.toBeNull();
      expect(root.querySelector('button')).toBeNull();
      // Angular RouterLink resolves the href attribute on the anchor.
      expect(anchor?.getAttribute('href')).toBe('/dossier/starwizz');
    });

    it('emits clicked when the anchor is activated', () => {
      const fixture = createFixture();
      fixture.componentInstance.routerLink = ['/dossier/starwizz'];
      fixture.detectChanges();
      const anchor = (fixture.nativeElement as HTMLElement).querySelector(
        'a.text-button',
      ) as HTMLAnchorElement | null;
      anchor?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(fixture.componentInstance.clicks).toBe(1);
    });

    it('surfaces disabled state via aria-disabled (not the native attribute)', () => {
      const fixture = createFixture();
      fixture.componentInstance.routerLink = ['/dossier/starwizz'];
      fixture.componentInstance.disabled = true;
      fixture.detectChanges();
      const anchor = (fixture.nativeElement as HTMLElement).querySelector(
        'a.text-button',
      ) as HTMLAnchorElement | null;
      expect(anchor?.getAttribute('aria-disabled')).toBe('true');
      expect(anchor?.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('href render mode (external)', () => {
    it('renders as an anchor with target=_blank and rel=noopener noreferrer', () => {
      const fixture = createFixture();
      fixture.componentInstance.href = 'https://github.com/example/repo';
      fixture.detectChanges();
      const anchor = (fixture.nativeElement as HTMLElement).querySelector(
        'a.text-button',
      ) as HTMLAnchorElement | null;
      expect(anchor?.getAttribute('href')).toBe('https://github.com/example/repo');
      expect(anchor?.getAttribute('target')).toBe('_blank');
      expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('emits clicked when the external anchor is activated', () => {
      const fixture = createFixture();
      fixture.componentInstance.href = 'https://github.com/example/repo';
      fixture.detectChanges();
      const anchor = (fixture.nativeElement as HTMLElement).querySelector(
        'a.text-button',
      ) as HTMLAnchorElement | null;
      anchor?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(fixture.componentInstance.clicks).toBe(1);
    });
  });
});
