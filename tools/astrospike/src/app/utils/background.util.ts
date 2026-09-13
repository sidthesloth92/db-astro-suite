import { BackgroundMap, LuminanceImage } from '../models/detection.types';

/**
 * Computes the median of the first `count` entries of `values`, sorting that
 * prefix in place. Even counts average the two central values.
 */
function medianInPlace(values: Float32Array, count: number): number {
  const prefix = values.subarray(0, count);
  prefix.sort();
  const mid = count >> 1;
  return count % 2 === 1 ? prefix[mid] : (prefix[mid - 1] + prefix[mid]) / 2;
}

/**
 * Fills per-pixel bilinear interpolation tables for one axis: for each pixel
 * coordinate, the lower tile index and the fractional distance toward the
 * next tile center. Coordinates outside the first/last tile centers clamp to
 * the nearest center (fraction 0 or 1).
 */
function fillAxisInterpolation(
  size: number,
  centers: Float64Array,
  lower: Int32Array,
  frac: Float32Array,
): void {
  const last = centers.length - 1;
  let seg = 0;
  for (let p = 0; p < size; p++) {
    if (last === 0 || p <= centers[0]) {
      lower[p] = 0;
      frac[p] = 0;
    } else if (p >= centers[last]) {
      lower[p] = last - 1;
      frac[p] = 1;
    } else {
      while (p > centers[seg + 1]) {
        seg++;
      }
      lower[p] = seg;
      frac[p] = (p - centers[seg]) / (centers[seg + 1] - centers[seg]);
    }
  }
}

/**
 * Estimates a smooth per-pixel background and a robust global noise sigma.
 *
 * The plane is divided into a mesh of `tileSize` x `tileSize` tiles (edge
 * tiles partial). Each tile's level is the median of its pixels subsampled
 * every 2nd pixel on each axis, and the tile-center values are bilinearly
 * interpolated to a full per-pixel background plane. Sigma is
 * 1.4826 * MAD of the background-subtracted residuals sampled every 4th
 * pixel on each axis.
 */
export function estimateBackground(lum: LuminanceImage, tileSize: number): BackgroundMap {
  const { data, width, height } = lum;
  if (width === 0 || height === 0) {
    return { background: new Float32Array(0), sigma: 0 };
  }

  const tilesX = Math.max(1, Math.ceil(width / tileSize));
  const tilesY = Math.max(1, Math.ceil(height / tileSize));
  const tileMedians = new Float32Array(tilesX * tilesY);
  const centersX = new Float64Array(tilesX);
  const centersY = new Float64Array(tilesY);

  // Scratch buffer for one tile's subsampled pixels (every 2nd px per axis).
  const samplesPerAxis = Math.ceil(tileSize / 2);
  const scratch = new Float32Array(samplesPerAxis * samplesPerAxis);

  for (let ty = 0; ty < tilesY; ty++) {
    const y0 = ty * tileSize;
    const y1 = Math.min(y0 + tileSize, height);
    centersY[ty] = (y0 + y1 - 1) / 2;
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const x1 = Math.min(x0 + tileSize, width);
      if (ty === 0) {
        centersX[tx] = (x0 + x1 - 1) / 2;
      }
      let n = 0;
      for (let y = y0; y < y1; y += 2) {
        const row = y * width;
        for (let x = x0; x < x1; x += 2) {
          scratch[n++] = data[row + x];
        }
      }
      tileMedians[ty * tilesX + tx] = medianInPlace(scratch, n);
    }
  }

  const lowerX = new Int32Array(width);
  const fracX = new Float32Array(width);
  const lowerY = new Int32Array(height);
  const fracY = new Float32Array(height);
  fillAxisInterpolation(width, centersX, lowerX, fracX);
  fillAxisInterpolation(height, centersY, lowerY, fracY);

  const background = new Float32Array(width * height);
  const lastTileX = tilesX - 1;
  for (let y = 0; y < height; y++) {
    const ty0 = lowerY[y];
    const ty1 = Math.min(ty0 + 1, tilesY - 1);
    const wy = fracY[y];
    const rowTop = ty0 * tilesX;
    const rowBottom = ty1 * tilesX;
    const rowOut = y * width;
    for (let x = 0; x < width; x++) {
      const tx0 = lowerX[x];
      const tx1 = Math.min(tx0 + 1, lastTileX);
      const wx = fracX[x];
      const top = tileMedians[rowTop + tx0] * (1 - wx) + tileMedians[rowTop + tx1] * wx;
      const bottom = tileMedians[rowBottom + tx0] * (1 - wx) + tileMedians[rowBottom + tx1] * wx;
      background[rowOut + x] = top * (1 - wy) + bottom * wy;
    }
  }

  // Robust sigma: 1.4826 * MAD of residuals subsampled every 4th px per axis.
  const sampleCols = Math.floor((width - 1) / 4) + 1;
  const sampleRows = Math.floor((height - 1) / 4) + 1;
  const residuals = new Float32Array(sampleCols * sampleRows);
  let n = 0;
  for (let y = 0; y < height; y += 4) {
    const row = y * width;
    for (let x = 0; x < width; x += 4) {
      residuals[n++] = data[row + x] - background[row + x];
    }
  }
  const residualMedian = medianInPlace(residuals, n);
  for (let i = 0; i < n; i++) {
    residuals[i] = Math.abs(residuals[i] - residualMedian);
  }
  const mad = medianInPlace(residuals, n);
  const sigma = 1.4826 * mad;

  return { background, sigma };
}
