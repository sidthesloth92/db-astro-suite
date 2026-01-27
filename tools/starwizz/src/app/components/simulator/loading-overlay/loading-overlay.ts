import { Component, input } from '@angular/core';

@Component({
  selector: 'sw-loading-overlay',
  imports: [],
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.scss',
})
export class LoadingOverlay {
  progress = input.required<string>();
}
