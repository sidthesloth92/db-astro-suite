import { Component, ChangeDetectionStrategy, input, signal, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SpaceButtonComponent } from '../space-button/space-button.component';

@Component({
  selector: 'db-header',
  standalone: true,
  imports: [CommonModule, SpaceButtonComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  title = input<string>('App Name');
  logoSrc = input<string>('');
  logoLink = input<string>('');
  githubLink = input<string>('');
  aboutLink = input<string>('https://dineshbalajiv.com');
  tagline = input<string>('');

  isMobile = signal<boolean>(false);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth < 768);
      window.addEventListener('resize', () => {
        this.isMobile.set(window.innerWidth < 768);
      });
    }
  }
}
