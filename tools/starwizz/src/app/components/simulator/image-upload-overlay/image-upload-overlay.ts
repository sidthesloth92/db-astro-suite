import { Component, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dba-sw-image-upload-overlay',
  imports: [],
  templateUrl: './image-upload-overlay.html',
  styleUrl: './image-upload-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageUploadOverlay {
  imageSelected = output<Event>();

  handleImageUpload(event: Event): void {
    this.imageSelected.emit(event);
  }
}
