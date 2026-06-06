import { Component, input } from '@angular/core';

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  template: '<h1>Your Portfolio</h1>',
})
export class PortfolioPage {
  handle = input.required<string>();
}
