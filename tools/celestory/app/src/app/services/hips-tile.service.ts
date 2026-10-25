import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HIPS_SURVEY } from '../models/hips.constants';
import { SKY_IMAGE_DECODE_OPTIONS } from '../models/sky-assets.constants';
import { SkyAssetLoadError } from '../models/sky-assets.error';
import { describeError } from '../utils/describe-error.util';

/**
 * Fetches deep-sky survey tiles (HiPS, DSS2 colour) from CDS. The GPU tile
 * cache calls `fetchTile` on demand; all HTTP for the survey lives here.
 */
@Injectable({ providedIn: 'root' })
export class HipsTileService {
  private readonly http = inject(HttpClient);

  /** URL of a tile (`Norder{k}/Dir{⌊n/10000⌋·10000}/Npix{n}.jpg`). */
  tileUrl(order: number, pix: number): string {
    const dir = Math.floor(pix / 10000) * 10000;
    return `${HIPS_SURVEY.baseUrl}/Norder${order}/Dir${dir}/Npix${pix}.jpg`;
  }

  /** Download + decode one tile. Rejects with a typed error on failure. */
  async fetchTile(order: number, pix: number): Promise<ImageBitmap> {
    const url = this.tileUrl(order, pix);
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      return await createImageBitmap(blob, SKY_IMAGE_DECODE_OPTIONS);
    } catch (err: unknown) {
      throw new SkyAssetLoadError(url, describeError(err));
    }
  }
}
