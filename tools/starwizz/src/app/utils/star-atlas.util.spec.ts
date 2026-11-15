import { ATLAS_PADDING, PATCH_STRIDE } from '../constants/star-lift.constant';
import { makePhoto } from '../../testing/synthetic-photo.util';
import { StarGroup } from '../models/star-lift.model';
import { packStarAtlas } from './star-atlas.util';

const W = 80;
const H = 60;

describe('packStarAtlas', () => {
  /** A photo with one star, a starless copy, and a square cut-out around the star. */
  function fixture() {
    const pixels = makePhoto(W, H, [0.1, 0.1, 0.1], [{ x: 40, y: 30, amp: 0.6, sigma: 2 }]);
    const starless = makePhoto(W, H, [0.1, 0.1, 0.1]);
    const owner = new Int32Array(W * H).fill(-1);
    const group: StarGroup = { x0: 34, y0: 24, x1: 46, y1: 36 };
    for (let y = group.y0; y <= group.y1; y++) for (let x = group.x0; x <= group.x1; x++) owner[y * W + x] = 0;
    return { pixels, starless, owner, groups: [group] };
  }

  it('should store only the star’s own light, so adding it to the starless image rebuilds the photo', () => {
    const { pixels, starless, owner, groups } = fixture();
    const { atlas, atlasWidth, patches } = packStarAtlas(pixels, starless, owner, groups, W);

    const ax = patches[4];
    const ay = patches[5];
    for (let y = 24; y <= 36; y++) {
      for (let x = 34; x <= 46; x++) {
        const a = ((ay + y - 24) * atlasWidth + ax + x - 34) * 4;
        const s = (y * W + x) * 4;
        expect(atlas[a] + starless[s]).toBe(pixels[s]);
      }
    }
  });

  it('should describe the cut-out: centre, half size, atlas position and total light', () => {
    const { pixels, starless, owner, groups } = fixture();
    const { patches } = packStarAtlas(pixels, starless, owner, groups, W);

    expect(patches.length).toBe(PATCH_STRIDE);
    expect(patches[0]).toBe(40.5);
    expect(patches[1]).toBe(30.5);
    expect(patches[2]).toBe(6.5);
    expect(patches[3]).toBe(6.5);
    expect(patches[4]).toBe(ATLAS_PADDING);
    expect(patches[6]).toBe(13);
    expect(patches[8]).toBeGreaterThan(1);
  });

  it('should leave atlas pixels transparent where the cut-out does not own the photo', () => {
    const { pixels, starless, owner, groups } = fixture();
    owner[24 * W + 34] = -1; // a corner of the box that belongs to the backdrop
    const { atlas, atlasWidth, patches } = packStarAtlas(pixels, starless, owner, groups, W);
    const corner = (patches[5] * atlasWidth + patches[4]) * 4;
    expect(atlas[corner + 3]).toBe(0);
  });

  it('should place two cut-outs without overlapping', () => {
    const { pixels, starless, owner } = fixture();
    const second: StarGroup = { x0: 5, y0: 5, x1: 12, y1: 12 };
    for (let y = second.y0; y <= second.y1; y++) for (let x = second.x0; x <= second.x1; x++) owner[y * W + x] = 1;
    const { patches } = packStarAtlas(pixels, starless, owner, [{ x0: 34, y0: 24, x1: 46, y1: 36 }, second], W);

    const firstRight = patches[4] + patches[6];
    const secondLeft = patches[PATCH_STRIDE + 4];
    expect(secondLeft).toBeGreaterThanOrEqual(firstRight + ATLAS_PADDING);
  });
});
