import { TestBed } from '@angular/core/testing';
import { DEFAULT_HALO_PROFILE, SPIKE_PRESETS } from '../constants/spike-presets.constants';
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
  haloColor: { r: 255, g: 240, b: 220 },
};

/** Render params for an 8x8 source image at full resolution. */
const PARAMS: SpikeRenderParams = {
  stars: [STAR],
  fluxRef: STAR.flux,
  forcedStarIds: new Set<number>(),
  adjustments: new Map(),
  offsetX: 0,
  offsetY: 0,
  preset: SPIKE_PRESETS['classic'],
  spikeCount: 4,
  lengthFactor: 1,
  intensityFactor: 1,
  rotationDeg: 0,
  diffusionFactor: 0,
  mistFactor: 0,
  chromaFactor: 0,
  imageMaxDimension: 8,
  scale: 1,
};

/**
 * Builds a small real ImageBitmap from a filled canvas. `paint` draws on top
 * of the fill before the bitmap is taken.
 */
async function buildBitmap(
  width: number,
  height: number,
  paint?: (ctx: CanvasRenderingContext2D) => void,
): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('spec canvas has no 2d context');
  }
  ctx.fillStyle = '#101828';
  ctx.fillRect(0, 0, width, height);
  if (paint !== undefined) {
    paint(ctx);
  }
  return createImageBitmap(canvas);
}

/** Decodes an exported blob and returns one of its pixels as [r, g, b, a]. */
async function decodedPixelAt(blob: Blob, x: number, y: number): Promise<number[]> {
  const decoded = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('2D context unavailable in test');
  }
  ctx.drawImage(decoded, 0, 0);
  return Array.from(ctx.getImageData(x, y, 1, 1).data);
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

  it('should name a layer export after the layer convention', async () => {
    const bitmap = await buildBitmap(8, 8);

    const result = await service.exportImage(bitmap, PARAMS, 'layer', 0.92, 'My Photo.PNG');

    expect(result.filename).toBe('my_photo_astrospike_layer_8_8.png');
    expect(result.blob.type).toBe('image/png');
  });

  it('should leave the source image out of a layer export', async () => {
    // The point of a layer is that the photo is genuinely absent, so the user
    // can composite it over their own 16-bit master. An opaque black frame
    // would look similar on screen and ruin that, so decode and check alpha.
    // A roomy canvas with the fixture's tiny geometry leaves sky to inspect:
    // on an 8x8 canvas the glow radius alone blankets every pixel.
    const bitmap = await buildBitmap(64, 64);

    const result = await service.exportImage(bitmap, PARAMS, 'layer', 0.92, 'm31.png');
    const decoded = await createImageBitmap(result.blob);
    const canvas = document.createElement('canvas');
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('2D context unavailable in test');
    }
    ctx.drawImage(decoded, 0, 0);
    const { data } = ctx.getImageData(0, 0, decoded.width, decoded.height);

    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) {
        transparent++;
      }
    }
    expect(transparent).toBeGreaterThan(0);
  });

  it('should carry the glow halo into both a normal export and a layer export', async () => {
    // A centred star with the halo opened up to a 15 px radius on a 64 px
    // canvas; 4 px out the Moffat skirt is still bright. The normal export
    // must screen it over the photo, and the layer must carry it at its own
    // alpha in the star's halo colour.
    const bitmap = await buildBitmap(64, 64);
    const star: DetectedStar = { ...STAR, x: 32, y: 32 };
    const params: SpikeRenderParams = {
      ...PARAMS,
      stars: [star],
      preset: {
        ...SPIKE_PRESETS['classic'],
        haloProfile: { ...DEFAULT_HALO_PROFILE, haloRadiusScale: 0.3 },
      },
      lengthFactor: 0,
      diffusionFactor: 0.6,
      imageMaxDimension: 64,
    };
    const pixelAt = async (blob: Blob): Promise<Uint8ClampedArray> => {
      const decoded = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = decoded.width;
      canvas.height = decoded.height;
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        throw new Error('2D context unavailable in test');
      }
      ctx.drawImage(decoded, 0, 0);
      return ctx.getImageData(36, 32, 1, 1).data;
    };

    const photo = await pixelAt((await service.exportImage(bitmap, params, 'png', 0.92, 'a.png')).blob);
    // The fill is #101828 (16, 24, 40); the skirt lifts every channel and,
    // being red-led, lifts red more than blue.
    expect(photo[0]).toBeGreaterThan(0x10 + 10);
    expect(photo[0] - 0x10).toBeGreaterThan(photo[2] - 0x28);

    const layer = await pixelAt((await service.exportImage(bitmap, params, 'layer', 0.92, 'a.png')).blob);
    expect(layer[3]).toBeGreaterThan(0);
    expect(layer[0]).toBeGreaterThanOrEqual(layer[1]);
    expect(layer[1]).toBeGreaterThanOrEqual(layer[2]);
    bitmap.close();
  });

  it('should mist the sky beside a bright region in a normal export and carry it in a layer', async () => {
    // A 64 px frame with one 12 px white block and a star well away from it.
    // 6 px past the block's edge the haze is still there; the far corner is
    // beyond the widest mist scale and must stay the photo, byte for byte.
    const block = { x: 8, y: 8, size: 12 };
    const beside = { x: block.x + block.size + 6, y: block.y + block.size / 2 };
    const corner = { x: 63, y: 63 };
    const bitmap = await buildBitmap(64, 64, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(block.x, block.y, block.size, block.size);
    });
    const params: SpikeRenderParams = {
      ...PARAMS,
      stars: [{ ...STAR, x: 48, y: 48 }],
      mistFactor: 0.8,
      imageMaxDimension: 64,
    };

    const photo = (await service.exportImage(bitmap, params, 'png', 0.92, 'mw.png')).blob;
    const photoBeside = await decodedPixelAt(photo, beside.x, beside.y);
    const photoCorner = await decodedPixelAt(photo, corner.x, corner.y);
    // The fill is #101828 (16, 24, 40); the mist lifts every channel beside
    // the block and none in the corner.
    expect(photoBeside[0]).toBeGreaterThan(0x10);
    expect(photoBeside[1]).toBeGreaterThan(0x18);
    expect(photoBeside[2]).toBeGreaterThan(0x28);
    expect(photoBeside[3]).toBe(255);
    expect(photoCorner).toEqual([0x10, 0x18, 0x28, 255]);

    const layer = (await service.exportImage(bitmap, params, 'layer', 0.92, 'mw.png')).blob;
    const layerBeside = await decodedPixelAt(layer, beside.x, beside.y);
    expect(layerBeside[3]).toBeGreaterThan(0);
    expect(layerBeside[0]).toBeGreaterThan(0);
    bitmap.close();
  });

  it('should bake the source image into a normal export', async () => {
    const bitmap = await buildBitmap(64, 64);

    const result = await service.exportImage(bitmap, PARAMS, 'png', 0.92, 'm31.png');
    const decoded = await createImageBitmap(result.blob);
    const canvas = document.createElement('canvas');
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('2D context unavailable in test');
    }
    ctx.drawImage(decoded, 0, 0);
    const { data } = ctx.getImageData(0, 0, decoded.width, decoded.height);

    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) {
        transparent++;
      }
    }
    expect(transparent).toBe(0);
  });
});
