import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, from, map, type Observable, switchMap, throwError } from 'rxjs';
import { describeError } from '../utils/describe-error.util';
import { SkyAssetLoadError } from '../models/sky-assets.error';
import { SKY_ASSET_URLS, SKY_IMAGE_DECODE_OPTIONS } from '../models/sky-assets.constants';
import type { MilkyWayLoadOptions, SkyCoreAssets } from '../models/sky-assets.model';
import type { SkyCatalog } from '../models/sky-catalog.model';
import type { PackedStarCatalog } from '../models/star-catalog.model';
import { parseStarCatalog } from '../utils/star-catalog.util';

/**
 * Fetches the planetarium's data assets (star catalogues, constellation
 * figures, Milky Way + Moon textures). All HTTP for the sky lives here; the
 * renderer only ever sees decoded, typed assets.
 */
@Injectable({ providedIn: 'root' })
export class SkyAssetService {
  private readonly http = inject(HttpClient);

  /** Everything needed for the first frame, fetched in parallel. */
  loadCore(): Observable<SkyCoreAssets> {
    return forkJoin({
      stars: this.loadStarCatalog(SKY_ASSET_URLS.starsHipparcos),
      catalog: this.loadCatalog(),
      milkyWay: this.loadMilkyWay({ highRes: false }),
    });
  }

  /** The Tycho-2 extension (loaded lazily when the user zooms in). */
  loadTycho(): Observable<PackedStarCatalog> {
    return this.loadStarCatalog(SKY_ASSET_URLS.starsTycho);
  }

  /** The Milky Way map: AVIF, falling back to WebP where AVIF cannot be decoded. */
  loadMilkyWay(options: MilkyWayLoadOptions): Observable<ImageBitmap> {
    const primary = options.highRes ? SKY_ASSET_URLS.milkyWay8k : SKY_ASSET_URLS.milkyWay4k;
    return this.loadBitmap(primary).pipe(
      catchError((err: unknown) => {
        if (options.highRes) {
          return throwError(() => err);
        }
        return this.loadBitmap(SKY_ASSET_URLS.milkyWay4kFallback);
      }),
    );
  }

  /** The Moon colour map. */
  loadMoon(): Observable<ImageBitmap> {
    return this.loadBitmap(SKY_ASSET_URLS.moon);
  }

  private loadCatalog(): Observable<SkyCatalog> {
    return this.http.get<SkyCatalog>(SKY_ASSET_URLS.catalog).pipe(
      catchError((err: unknown) => throwError(() => new SkyAssetLoadError(SKY_ASSET_URLS.catalog, describeError(err)))),
    );
  }

  private loadStarCatalog(url: string): Observable<PackedStarCatalog> {
    return this.http.get(url, { responseType: 'arraybuffer' }).pipe(
      map((buf) => parseStarCatalog(buf)),
      catchError((err: unknown) => throwError(() => (err instanceof Error && err.name === 'StarCatalogFormatError' ? err : new SkyAssetLoadError(url, describeError(err))))),
    );
  }

  private loadBitmap(url: string): Observable<ImageBitmap> {
    return this.http.get(url, { responseType: 'blob' }).pipe(
      switchMap((blob) => from(createImageBitmap(blob, SKY_IMAGE_DECODE_OPTIONS))),
      catchError((err: unknown) => throwError(() => new SkyAssetLoadError(url, describeError(err)))),
    );
  }
}
