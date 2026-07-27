import { TestBed } from '@angular/core/testing';
import { SPIKE_PRESETS } from '../constants/spike-presets.constants';
import { DetectedStar } from '../models/detected-star.model';
import { SpikeRenderParams } from '../models/spike-render-params.model';
import { SpikeExportService } from './spike-export.service';

/** One bright centered star for the render pass. */
const STAR: DetectedStar = {
  id: 0,
  x: 4,
  y: 4,
  flux: 100,
  peak: 10,
  area: 5,
  elongation: 1,
  color: { r: 255, g: 240, b: 220 },
};

/** Render params for an 8x8 source image at full resolution. */
const PARAMS: SpikeRenderParams = {
  stars: [STAR],
  fluxRef: STAR.flux,
  preset: SPIKE_PRESETS['classic'],
  spikeCount: 4,
  lengthFactor: 1,
  intensityFactor: 1,
  rotationDeg: 0,
  imageMaxDimension: 8,
  scale: 1,
};

/** Builds a small real ImageBitmap from a filled canvas. */
async function buildBitmap(width: number, height: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('spec canvas has no 2d context');
  }
  ctx.fillStyle = '#101828';
  ctx.fillRect(0, 0, width, height);
  return createImageBitmap(canvas);
}

describe('SpikeExportService', () => {
  let service: SpikeExportService;
  let clickSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpikeExportService);
    clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
  });

  it('should export a PNG with a convention-following filename', async () => {
    const bitmap = await buildBitmap(8, 8);

    const result = await service.exportImage(bitmap, PARAMS, 'png', 0.92, 'My Photo.PNG');

    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.filename).toBe('my_photo_astrospike_8_8.png');
    expect(result.sizeBytes).toBe(result.blob.size);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    bitmap.close();
  });

  it('should export a JPEG with a .jpg extension', async () => {
    const bitmap = await buildBitmap(8, 8);

    const result = await service.exportImage(bitmap, PARAMS, 'jpeg', 0.8, 'stack.fits.png');

    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.filename).toBe('stack_fits_astrospike_8_8.jpg');
    bitmap.close();
  });

  it('should revoke the previous export URL only on the next export', async () => {
    const createSpy = spyOn(URL, 'createObjectURL').and.callThrough();
    const revokeSpy = spyOn(URL, 'revokeObjectURL').and.callThrough();
    const bitmap = await buildBitmap(8, 8);

    await service.exportImage(bitmap, PARAMS, 'png', 0.92, 'a.png');
    expect(revokeSpy).not.toHaveBeenCalled();

    await service.exportImage(bitmap, PARAMS, 'png', 0.92, 'b.png');
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(createSpy.calls.first().returnValue);
    bitmap.close();
  });
});
