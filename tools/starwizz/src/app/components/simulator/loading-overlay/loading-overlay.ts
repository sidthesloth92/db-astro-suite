import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dba-sw-loading-overlay',
  imports: [],
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingOverlay {
  progress = input.required<string>();
}
