import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NeonButtonComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'sw-header',
  standalone: true,
  imports: [CommonModule, NeonButtonComponent],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {}
