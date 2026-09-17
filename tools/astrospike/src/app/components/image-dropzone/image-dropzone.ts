import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent, lockIcon, TextButtonComponent, uploadIcon } from '@db-astro-suite/ui';

/**
 * Dumb drop-target card shown by the stage when no image is loaded. Accepts a
 * PNG/JPEG via full drag-and-drop or a hidden file input opened by the
 * "Select image" button, and emits the chosen `File` — it performs no
 * validation or loading itself (the editor service owns that).
 */
@Component({
  selector: 'dba-as-image-dropzone',
  standalone: true,
  imports: [IconComponent, TextButtonComponent],
  templateUrl: './image-dropzone.html',
  styleUrl: './image-dropzone.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageDropzone {
  /** Emits the first file the user dropped or picked via the file input. */
  readonly imageSelected = output<File>();

  /** True while a drag hovers over the dropzone — drives the highlight state. */
  protected readonly isDragging = signal(false);

  /** Upload glyph rendered in the card and on the "Select image" button. */
  protected readonly uploadIcon = uploadIcon;

  /** Padlock glyph accompanying the privacy note. */
  protected readonly lockIcon = lockIcon;

  /** Hidden file input — clicked programmatically by the "Select image" button. */
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Opens the OS file picker by forwarding to the hidden input. */
  protected openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  /** Emits the picked file from the hidden input's change event. */
  protected onFileInputChange(event: Event): void {
    // Justification for the cast: the change event fires on the hidden
    // <input type="file"> this handler is bound to, so the target is always
    // an HTMLInputElement.
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    if (file !== null) {
      this.imageSelected.emit(file);
    }
    // Allow re-selecting the same file later.
    input.value = '';
  }

  /** Drag entered the card — prevent default so a drop is allowed. */
  protected onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  /** Drag hovering over the card — keep signalling it is a valid target. */
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  /** Drag left the card — drop the highlight. */
  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  /**
   * File dropped on the card — emit the first file. Propagation stops here so
   * the stage-level replace-image drop handler never double-loads it.
   */
  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files.item(0) ?? null;
    if (file !== null) {
      this.imageSelected.emit(file);
    }
  }
}
