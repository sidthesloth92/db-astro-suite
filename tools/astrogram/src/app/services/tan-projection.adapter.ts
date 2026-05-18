import { PixelCoord, WcsAdapter, WorldCoord } from './wcs-adapter';

/**
 * Custom TAN (gnomonic) projection adapter using the CD matrix from FITS headers.
 * No external dependencies — pure math implementation covering 99%+ of solve-field output.
 *
 * Coordinate conventions:
 * - Sky: J2000 RA/Dec in degrees
 * - Pixel: 0-based (top-left = 0,0), matching CSS/Canvas coordinates
 * - FITS headers use 1-based CRPIX; we subtract 1 for 0-based output
 */
export class TanProjectionAdapter implements WcsAdapter {
  private crpix1 = 0;
  private crpix2 = 0;
  private crval1 = 0; // RA of reference point (degrees)
  private crval2 = 0; // Dec of reference point (degrees)
  private cd11 = 0;
  private cd12 = 0;
  private cd21 = 0;
  private cd22 = 0;
  private cdDet = 0; // determinant of CD matrix
  private imgW = 0;
  private imgH = 0;
  private ready = false;

  initialize(wcsHeader: string, imageWidth: number, imageHeight: number): void {
    const p = this.parseFitsHeader(wcsHeader);

    this.crpix1 = p['CRPIX1'] ?? 0;
    this.crpix2 = p['CRPIX2'] ?? 0;
    this.crval1 = p['CRVAL1'] ?? 0;
    this.crval2 = p['CRVAL2'] ?? 0;
    this.cd11 = p['CD1_1'] ?? 0;
    this.cd12 = p['CD1_2'] ?? 0;
    this.cd21 = p['CD2_1'] ?? 0;
    this.cd22 = p['CD2_2'] ?? 0;

    // IMAGEW/IMAGEH are always written by solve-field; NAXIS1/NAXIS2 may be 0
    this.imgW = p['IMAGEW'] || p['NAXIS1'] || imageWidth;
    this.imgH = p['IMAGEH'] || p['NAXIS2'] || imageHeight;

    this.cdDet = this.cd11 * this.cd22 - this.cd12 * this.cd21;
    this.ready = this.cdDet !== 0;
  }

  skyToPix(ra: number, dec: number): PixelCoord | null {
    if (!this.ready) return null;

    const d2r = Math.PI / 180;
    const ra0 = this.crval1 * d2r;
    const dec0 = this.crval2 * d2r;
    const raRad = ra * d2r;
    const decRad = dec * d2r;

    const cosDec = Math.cos(decRad);
    const sinDec = Math.sin(decRad);
    const cosDec0 = Math.cos(dec0);
    const sinDec0 = Math.sin(dec0);
    const deltaRa = raRad - ra0;
    const cosDeltaRa = Math.cos(deltaRa);

    // Denominator for gnomonic (TAN) projection
    const denom = sinDec0 * sinDec + cosDec0 * cosDec * cosDeltaRa;
    if (denom <= 0) return null; // Object behind the tangent point

    // Standard coordinates (xi, eta) in degrees
    const r2d = 180 / Math.PI;
    const xi = ((cosDec * Math.sin(deltaRa)) / denom) * r2d;
    const eta = ((cosDec0 * sinDec - sinDec0 * cosDec * cosDeltaRa) / denom) * r2d;

    // Invert CD matrix: [dx, dy] = CD^-1 * [xi, eta]
    const dx = (this.cd22 * xi - this.cd12 * eta) / this.cdDet;
    const dy = (-this.cd21 * xi + this.cd11 * eta) / this.cdDet;

    // CRPIX is FITS 1-based; subtract 1 for 0-based pixel coords
    const x = this.crpix1 + dx - 1;
    const y = this.crpix2 + dy - 1;

    if (isNaN(x) || isNaN(y)) return null;
    return { x, y };
  }

  pixToSky(x: number, y: number): WorldCoord | null {
    if (!this.ready) return null;

    // Convert 0-based pixel to offset from CRPIX (FITS 1-based)
    const dx = x - this.crpix1 + 1;
    const dy = y - this.crpix2 + 1;

    // Apply CD matrix: [xi, eta] = CD * [dx, dy]  (degrees)
    const xi = this.cd11 * dx + this.cd12 * dy;
    const eta = this.cd21 * dx + this.cd22 * dy;

    const d2r = Math.PI / 180;
    const r2d = 180 / Math.PI;
    const xiRad = xi * d2r;
    const etaRad = eta * d2r;
    const dec0 = this.crval2 * d2r;

    const sinDec0 = Math.sin(dec0);
    const cosDec0 = Math.cos(dec0);
    const denom = cosDec0 - etaRad * sinDec0;

    const ra = this.crval1 + Math.atan2(xiRad, denom) * r2d;
    const dec =
      Math.atan2(sinDec0 + etaRad * cosDec0, Math.sqrt(xiRad * xiRad + denom * denom)) * r2d;

    return { ra: ((ra % 360) + 360) % 360, dec };
  }

  getArcsecPerPixel(): number {
    // Plate scale from the CD matrix column norms, averaged
    const scaleX = Math.sqrt(this.cd11 * this.cd11 + this.cd21 * this.cd21);
    const scaleY = Math.sqrt(this.cd12 * this.cd12 + this.cd22 * this.cd22);
    return ((scaleX + scaleY) / 2) * 3600; // degrees → arcseconds
  }

  getImageWidth(): number {
    return this.imgW;
  }

  getImageHeight(): number {
    return this.imgH;
  }

  private parseFitsHeader(header: string): Record<string, any> {
    const params: Record<string, any> = {};
    let records: string[];

    if (!header.includes('\n')) {
      // Binary FITS header: 80-char fixed records
      const padded = header + ' '.repeat((80 - (header.length % 80)) % 80);
      records = [];
      for (let i = 0; i < padded.length; i += 80) {
        records.push(padded.substring(i, i + 80));
      }
    } else {
      records = header.split('\n');
    }

    for (const line of records) {
      const match = line.match(/^([A-Z0-9_-]{1,8})\s*=\s*(.+)/);
      if (!match) continue;

      const key = match[1].trim();
      let val = match[2].split('/')[0].trim(); // strip inline comments

      if (val.startsWith("'")) {
        const end = val.indexOf("'", 1);
        params[key] = end > 0 ? val.substring(1, end).trim() : val;
      } else if (val === 'T') {
        params[key] = true;
      } else if (val === 'F') {
        params[key] = false;
      } else {
        // Handle scientific notation (e.g., -5.8333E-04)
        const num = Number(val);
        params[key] = isNaN(num) ? val : num;
      }
    }

    return params;
  }
}
