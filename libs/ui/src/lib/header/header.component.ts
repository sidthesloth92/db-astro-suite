import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpaceButtonComponent } from '../space-button/space-button.component';

@Component({
  selector: 'db-header',
  standalone: true,
  imports: [CommonModule, SpaceButtonComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input() title: string = 'App Name';
  @Input() logoSrc: string = '';
  @Input() logoLink: string = '';
  @Input() githubLink: string = '';
  @Input() aboutLink: string = 'https://dineshbalajiv.com';
  @Input() tagline: string = '';

  isMobile = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth < 768;
      window.addEventListener('resize', () => {
        this.isMobile = window.innerWidth < 768;
      });
    }
  }
}
