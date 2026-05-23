import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

@Component({
  standalone: true,
  imports: [HeaderComponent],
  template: `
    <dba-ui-header
      [title]="title"
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
    expect(root.querySelector('.brand-version')?.textContent?.trim()).toBe('v1.2.3');
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
