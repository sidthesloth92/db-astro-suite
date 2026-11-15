import { photoWorkingCopy } from './photo-working-copy.util';

/** Loads a canvas of the given size and colour as an image element. */
function imageOf(width: number, height: number, color: string): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // Justification for the non-null assertion: a 2D context is always available in the test browser.
  const context = canvas.getContext('2d')!;
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = canvas.toDataURL('image/png');
  });
}

describe('photoWorkingCopy', () => {
  it('should shrink a large photo so its longer edge fits, keeping its shape', async () => {
    const copy = photoWorkingCopy(await imageOf(400, 200, '#204060'), 100);
    expect(copy?.width).toBe(100);
    expect(copy?.height).toBe(50);
  });

  it('should not enlarge a photo that is already small enough', async () => {
    const copy = photoWorkingCopy(await imageOf(40, 30, '#204060'), 100);
    expect(copy?.width).toBe(40);
    expect(copy?.height).toBe(30);
  });

  it('should carry the photo’s pixels across', async () => {
    const copy = photoWorkingCopy(await imageOf(40, 30, '#204060'), 100);
    expect(Array.from(copy?.data.subarray(0, 4) ?? [])).toEqual([0x20, 0x40, 0x60, 255]);
  });
});
