import { InjectionToken } from '@angular/core';

export interface PixelCoord {
  x: number; // 0-based pixel X
  y: number; // 0-based pixel Y
}

export interface WorldCoord {
  ra: number; // Right Ascension in degrees
  dec: number; // Declination in degrees
}

/**
 * Abstraction for World Coordinate System (WCS) projection.
 * All pixel coordinates are 0-based (top-left = 0,0).
 * All sky coordinates are J2000 RA/Dec in degrees.
 */
export interface WcsAdapter {
  initialize(wcsHeader: string, imageWidth: number, imageHeight: number): void;
  skyToPix(ra: number, dec: number): PixelCoord | null;
  pixToSky(x: number, y: number): WorldCoord | null;
  getArcsecPerPixel(): number;
  getImageWidth(): number;
  getImageHeight(): number;
}

export const WCS_ADAPTER = new InjectionToken<WcsAdapter>('WCS_ADAPTER');
