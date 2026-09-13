import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageDropzone } from './image-dropzone';

/** Builds a small PNG file for selection/drop simulation. */
function makeFile(name = 'm31.png'): File {
  return new File(['fake-png-bytes'], name, { type: 'image/png' });
}

/** Builds a DataTransfer carrying the given file (Chrome supports the ctor). */
function makeDataTransfer(file: File): DataTransfer {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  return dataTransfer;
}

describe('ImageDropzone', () => {
  let fixture: ComponentFixture<ImageDropzone>;
  let emitted: File[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImageDropzone] }).compileComponents();
    fixture = TestBed.createComponent(ImageDropzone);
    emitted = [];
    fixture.componentInstance.imageSelected.subscribe((file) => emitted.push(file));
    fixture.detectChanges();
  });

  function dropzoneEl(): HTMLElement {
    const el = fixture.nativeElement.querySelector('.dropzone');
    if (el === null) {
      throw new Error('dropzone element not rendered');
    }
    return el;
  }

  it('should emit the selected file when a file is picked via the hidden input', () => {
    const input: HTMLInputElement | null = fixture.nativeElement.querySelector(
      'input[data-testid="file-input"]',
    );
    if (input === null) {
      throw new Error('hidden file input not rendered');
    }
    const file = makeFile('andromeda.png');
    input.files = makeDataTransfer(file).files;

    input.dispatchEvent(new Event('change'));

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('andromeda.png');
    expect(input.value).toBe(''); // reset so the same file can be re-picked
  });

  it('should emit the first dropped file on drop', () => {
    const file = makeFile('orion.png');
    const event = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: makeDataTransfer(file),
    });

    dropzoneEl().dispatchEvent(event);

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('orion.png');
    expect(event.defaultPrevented).toBeTrue();
  });

  it('should toggle the is-dragging class on dragenter and dragleave', () => {
    const el = dropzoneEl();
    expect(el.classList.contains('is-dragging')).toBeFalse();

    el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(el.classList.contains('is-dragging')).toBeTrue();

    el.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
    fixture.detectChanges();
    expect(el.classList.contains('is-dragging')).toBeFalse();
  });

  it('should clear the drag state when a file is dropped', () => {
    const el = dropzoneEl();
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(el.classList.contains('is-dragging')).toBeTrue();

    el.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: makeDataTransfer(makeFile()),
      }),
    );
    fixture.detectChanges();
    expect(el.classList.contains('is-dragging')).toBeFalse();
  });
});
