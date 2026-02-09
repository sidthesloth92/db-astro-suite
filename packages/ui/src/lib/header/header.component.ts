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
  @Input() githubLink: string = '';
  @Input() aboutLink: string = 'https://dineshbalajiv.com';
  @Input() tagline: string = '';
}
