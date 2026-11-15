import { isImageReady } from './image-ready.util';

/** An image that reports the given load state without fetching anything. */
function imageWith(complete: boolean, naturalWidth: number): HTMLImageElement {
  const image = new Image();
  Object.defineProperty(image, 'complete', { get: () => complete });
  Object.defineProperty(image, 'naturalWidth', { get: () => naturalWidth });
  return image;
}

describe('isImageReady', () => {
  it('should be ready once the image has loaded with pixels', () => {
    expect(isImageReady(imageWith(true, 1080))).toBeTrue();
  });

  it('should not be ready while the image is still loading', () => {
    expect(isImageReady(imageWith(false, 0))).toBeFalse();
  });

  it('should not be ready when the image failed or has no source', () => {
    expect(isImageReady(imageWith(true, 0))).toBeFalse();
    expect(isImageReady(new Image())).toBeFalse();
  });
});
