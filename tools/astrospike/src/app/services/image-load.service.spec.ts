import { TestBed } from '@angular/core/testing';
import { MAX_CANVAS_DIMENSION } from '../constants/render.constants';
import {
  ImageDecodeError,
  ImageTooLargeError,
  UnsupportedFormatError,
} from '../models/image-load.error';
import { ImageLoadService } from './image-load.service';

/** Renders a small filled canvas and returns it as a PNG File. */
async function buildPngFile(width: number, height: number, name: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('spec canvas has no 2d context');
  }
  ctx.fillStyle = '#204060';
  ctx.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b !== null ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
  return new File([blob], name, { type: 'image/png' });
}

describe('ImageLoadService', () => {
  let service: ImageLoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageLoadService);
  });

  it('should reject files whose MIME type is not PNG or JPEG', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await expectAsync(service.loadImageFile(file)).toBeRejectedWithError(UnsupportedFormatError);
  });

  it('should decode a small PNG and return its bitmap and metadata', async () => {
    const file = await buildPngFile(12, 10, 'My Test Image.png');

    const { bitmap, meta } = await service.loadImageFile(file);

    expect(bitmap.width).toBe(12);
    expect(bitmap.height).toBe(10);
    expect(meta).toEqual({ fileName: 'My Test Image.png', width: 12, height: 10 });
    bitmap.close();
  });

  it('should reject undecodable data with an ImageDecodeError', async () => {
    const file = new File(['this is not a real png'], 'broken.png', { type: 'image/png' });
    await expectAsync(service.loadImageFile(file)).toBeRejectedWithError(ImageDecodeError);
  });

  it('should reject and close bitmaps larger than the canvas limit', async () => {
    const closeSpy = jasmine.createSpy('close');
    // Justification for the cast: the guard branch only reads width/height and
    // calls close(); a full ImageBitmap is not constructible at this size.
    const oversized = {
      width: MAX_CANVAS_DIMENSION + 1,
      height: 10,
      close: closeSpy,
    } as unknown as ImageBitmap;
    spyOn(window, 'createImageBitmap').and.resolveTo(oversized);

    const file = await buildPngFile(4, 4, 'huge.png');
    await expectAsync(service.loadImageFile(file)).toBeRejectedWithError(ImageTooLargeError);
    expect(closeSpy).toHaveBeenCalled();
  });
});
