import { Injectable } from '@angular/core';
import { TanProjectionAdapter } from './tan-projection.adapter';
import { PixelCoord, WcsAdapter, WorldCoord } from './wcs-adapter';

export type { PixelCoord as PixelCoordinate, WorldCoord as WorldCoordinate };

@Injectable({
  providedIn: 'root',
})
export class WcsService {
  private adapter: WcsAdapter = new TanProjectionAdapter();

  public initialize(wcsHeader: string, imageWidth: number, imageHeight: number): void {
    this.adapter.initialize((wcsHeader || '').trim(), imageWidth, imageHeight);
  }

  /** Project RA/Dec to 0-based pixel coordinates. */
  public skyToPix(ra: number, dec: number): PixelCoord | null {
    return this.adapter.skyToPix(ra, dec);
  }

  /** Convert 0-based pixel coordinates to RA/Dec. */
  public pixToSky(x: number, y: number): WorldCoord | null {
    return this.adapter.pixToSky(x, y);
  }

  public getArcsecPerPixel(): number {
    return this.adapter.getArcsecPerPixel();
  }

  public getImageWidth(): number {
    return this.adapter.getImageWidth();
  }

  public getImageHeight(): number {
    return this.adapter.getImageHeight();
  }
}
