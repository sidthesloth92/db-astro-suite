import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

@Component({
  standalone: true,
  imports: [HeaderComponent],
  template: `
    <dba-ui-header
      [title]="title"
      [titleAccent]="titleAccent"
      [version]="version"
      [logoSrc]="logoSrc"
      [tagline]="tagline"
      [githubLink]="githubLink"
    >
      <div slot="center">CENTER_SLOT_CONTENT</div>
    </dba-ui-header>
  `,
})
class HostComponent {
  title = 'starwizz';
  titleAccent = '';
  version = '1.2.3';
  logoSrc = 'assets/img/sw.png';
  tagline = 'Cinematic Starfield Generator';
  githubLink = 'https://github.com/example/repo';
}

describe('HeaderComponent', () => {
  it('renders the brand title, version pill, and tagline', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.brand-title')?.textContent?.trim()).toBe('starwizz');
    // Version is now rendered inside a `<dba-ui-pill-badge>` element rather
    // than a dedicated `.brand-version` span. The pill's slotted content
    // includes the "v" prefix.
    expect(root.querySelector('dba-ui-pill-badge')?.textContent?.trim()).toBe('v1.2.3');
  });

  it('splits the title into white base and accent suffix when titleAccent is a suffix', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.title = 'STARWIZZ';
    fixture.componentInstance.titleAccent = 'WIZZ';
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.brand-title-base')?.textContent?.trim()).toBe('STAR');
    expect(root.querySelector('.brand-title-accent')?.textContent?.trim()).toBe('WIZZ');
    // Full title preserved for accessibility / overall text content.
    expect(root.querySelector('.brand-title')?.textContent?.trim()).toBe('STARWIZZ');
  });

  it('renders the whole title in one span when titleAccent is not a suffix', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.title = 'STARWIZZ';
    fixture.componentInstance.titleAccent = 'NOPE';
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.brand-title-accent')).toBeNull();
    expect(root.querySelector('.brand-title')?.textContent?.trim()).toBe('STARWIZZ');
  });

  it('projects [slot=center] content between brand and actions', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const slot = root.querySelector('.center-slot');
    expect(slot?.textContent).toContain('CENTER_SLOT_CONTENT');
  });

  it('renders a GitHub link with rel noopener when githubLink is set', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.github-link',
    ) as HTMLAnchorElement | null;
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.getAttribute('target')).toBe('_blank');
  });
});
