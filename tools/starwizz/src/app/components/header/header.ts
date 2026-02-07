import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpaceButtonComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'sw-header',
  standalone: true,
  imports: [CommonModule, SpaceButtonComponent],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {}
