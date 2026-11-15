import {
  ATLAS_MAX_HEIGHT,
  ATLAS_PADDING,
  ATLAS_WIDTH,
  PATCH_STRIDE,
} from '../constants/star-lift.constant';
import { StarAtlas, StarGroup } from '../models/star-lift.model';

/**
 * Packs every lifted cut-out into one atlas texture. Each cut-out holds only the star's own
 * light (photo minus starless), so drawing it additively over the starless backdrop rebuilds
 * the photo exactly. Cut-outs are shelf-packed tallest first; any that do not fit the maximum
 * atlas height keep a zero-sized atlas entry and are not drawn.
 *
 * @param pixels - The photo, RGBA
 * @param starless - The photo with holes filled, RGBA
 * @param owner - Per-pixel patch index (-1 = backdrop)
 * @param groups - Cut-out bounds, indexed by patch index
 * @param width - Working-image width in px
 */
export function packStarAtlas(
  pixels: Uint8ClampedArray,
  starless: Uint8ClampedArray,
  owner: Int32Array,
  groups: readonly StarGroup[],
  width: number,
): StarAtlas {
  const patches = new Float32Array(groups.length * PATCH_STRIDE);
  const order = groups
    .map((_, index) => index)
    .sort((a, b) => groups[b].y1 - groups[b].y0 - (groups[a].y1 - groups[a].y0));

  // Shelf packing: fill a row left to right, then start a new row below the tallest patch.
  let cursorX = ATLAS_PADDING;
  let cursorY = ATLAS_PADDING;
  let rowHeight = 0;
  for (const index of order) {
    const group = groups[index];
    const w = group.x1 - group.x0 + 1;
    const h = group.y1 - group.y0 + 1;
    if (cursorX + w + ATLAS_PADDING > ATLAS_WIDTH) {
      cursorX = ATLAS_PADDING;
      cursorY += rowHeight + ATLAS_PADDING;
      rowHeight = 0;
    }
    const o = index * PATCH_STRIDE;
    patches[o] = (group.x0 + group.x1 + 1) / 2;
    patches[o + 1] = (group.y0 + group.y1 + 1) / 2;
    patches[o + 2] = w / 2;
    patches[o + 3] = h / 2;
    const fits = cursorY + h + ATLAS_PADDING <= ATLAS_MAX_HEIGHT && w + 2 * ATLAS_PADDING <= ATLAS_WIDTH;
    if (fits) {
      patches[o + 4] = cursorX;
      patches[o + 5] = cursorY;
      patches[o + 6] = w;
      patches[o + 7] = h;
      cursorX += w + ATLAS_PADDING;
      rowHeight = Math.max(rowHeight, h);
    }
  }

  const atlasHeight = Math.max(1, Math.min(ATLAS_MAX_HEIGHT, cursorY + rowHeight + ATLAS_PADDING));
  const atlas = new Uint8ClampedArray(ATLAS_WIDTH * atlasHeight * 4);
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    const o = index * PATCH_STRIDE;
    const placed = patches[o + 6] > 0;
    let flux = 0;
    for (let y = group.y0; y <= group.y1; y++) {
      for (let x = group.x0; x <= group.x1; x++) {
        const source = y * width + x;
        if (owner[source] !== index) continue;
        const r = Math.max(0, pixels[source * 4] - starless[source * 4]);
        const g = Math.max(0, pixels[source * 4 + 1] - starless[source * 4 + 1]);
        const b = Math.max(0, pixels[source * 4 + 2] - starless[source * 4 + 2]);
        flux += r + g + b;
        if (!placed) continue;
        const target =
          ((patches[o + 5] + y - group.y0) * ATLAS_WIDTH + patches[o + 4] + x - group.x0) * 4;
        atlas[target] = r;
        atlas[target + 1] = g;
        atlas[target + 2] = b;
        atlas[target + 3] = 255;
      }
    }
    patches[o + 8] = flux / 255;
  }

  return { atlas, atlasWidth: ATLAS_WIDTH, atlasHeight, patches };
}
