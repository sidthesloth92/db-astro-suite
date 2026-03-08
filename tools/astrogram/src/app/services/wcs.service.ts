import { Injectable } from '@angular/core';
import { WCSTransform, MapKeywordProvider } from 'coordtxl';

export interface WorldCoordinate {
  ra: number;
  dec: number;
}

export interface PixelCoordinate {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root',
})
export class WcsService {
  private transformer: any;
  private imageWidth: number = 1080;
  private imageHeight: number = 1080;
  private logCount = 0;

  public initialize(wcsHeader: string, imageWidth: number, imageHeight: number) {
    const trimmedHeader = (wcsHeader || '').trim();
    const params = this.parseFitsHeader(trimmedHeader);

    let w = params['IMAGEW'] || imageWidth;
    let h = params['IMAGEH'] || imageHeight;

    if (!w && params['NAXIS1']) w = params['NAXIS1'];
    if (!h && params['NAXIS2']) h = params['NAXIS2'];

    this.imageWidth = w || 1000;
    this.imageHeight = h || 1000;

    console.log(`Initializing Stellar Map WCS: ${this.imageWidth}x${this.imageHeight}`);

    try {
      const provider = new MapKeywordProvider(params);
      this.transformer = new WCSTransform(provider);

      if (this.transformer.isValid()) {
        console.log('🏛️ WCS Engine initialized and verified.');
      } else {
        console.warn('WCS Header parsed but projection reports invalid — check FITS keywords.');
      }
    } catch (err) {
      console.error('Fatal failure in WCS Engine startup:', err);
      this.transformer = null;
    }
  }

  public resetLogCount() {
    this.logCount = 0;
  }

  public skyToPix(ra: number, dec: number): PixelCoordinate | null {
    if (!this.transformer) return null;

    try {
      const pix = this.transformer.wcs2pix(ra, dec);
      if (!pix) return null;

      const x = (pix.x / this.imageWidth) * 100;
      const y = (pix.y / this.imageHeight) * 100;

      if (this.logCount < 5) {
        console.log(
          `🎯 Projection: RA ${ra.toFixed(3)}, Dec ${dec.toFixed(3)} => Pix(${pix.x.toFixed(1)}, ${pix.y.toFixed(1)}) => X:${x.toFixed(1)}%, Y:${y.toFixed(1)}%`,
        );
        this.logCount++;
      }

      return { x, y };
    } catch (err) {
      return null;
    }
  }

  public pixToSky(xPercent: number, yPercent: number): WorldCoordinate | null {
    if (!this.transformer) return null;
    try {
      const x = (xPercent / 100) * this.imageWidth;
      const y = (yPercent / 100) * this.imageHeight;
      const sky = this.transformer.pix2wcs(x, y);
      return { ra: sky.x, dec: sky.y };
    } catch (err) {
      return null;
    }
  }

  private parseFitsHeader(header: string): any {
    const params: any = {};
    let records: string[] = [];

    // FITS headers are theoretically multiples of 80 characters.
    if (!header.includes('\n')) {
      const paddingNeeded = 80 - (header.length % 80);
      if (paddingNeeded !== 80) {
        header += ' '.repeat(paddingNeeded);
      }

      for (let i = 0; i < header.length; i += 80) {
        records.push(header.substring(i, i + 80));
      }
    } else {
      records = header.split('\n');
    }

    for (const line of records) {
      const match = line.match(/^([A-Z0-9_-]{1,8})\s*=\s*([^/]+)/);
      if (match) {
        const key = match[1].trim();
        let valueStr = match[2].trim();

        if (valueStr.startsWith("'")) {
          const secondQuoteIndex = valueStr.indexOf("'", 1);
          if (secondQuoteIndex !== -1) {
            valueStr = valueStr.substring(1, secondQuoteIndex).trim();
          }
        }

        let finalValue: any = valueStr;
        if (valueStr === 'T') finalValue = true;
        else if (valueStr === 'F') finalValue = false;
        else if (!isNaN(Number(valueStr))) finalValue = Number(valueStr);

        params[key] = finalValue;
      }
    }

    return params;
  }
}
