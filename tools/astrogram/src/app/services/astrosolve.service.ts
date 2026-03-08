import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ImageAnnotation } from '../models/annotation.models';

export interface AstrosolveSolveResponse {
  status: string;
  metadata: {
    ra: number;
    dec: number;
    scale: number;
    wcs: string;
    radius_searched: number;
  };
  objects: Array<{
    name: string;
    type: string;
    ra: number;
    dec: number;
    magnitude: number;
    source: 'local' | 'simbad';
    catalog?: string;
    entryId?: string;
    commonName?: string;
  }>;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AstrosolveService {
  private readonly baseUrl = 'http://localhost:3000/api v1';

  constructor(private http: HttpClient) {}

  /**
   * Upload an image to the local Astrosolve API for fast plate solving.
   *
   * @param file The background image file (must be >= 1080x1080)
   * @param hints The hints required/optional for Astrometry.net to solve the image
   */
  async solveImage(
    file: File,
    hints: {
      types?: string[];
    },
    onProgress?: (msg: string) => void,
  ): Promise<AstrosolveSolveResponse> {
    onProgress?.('Preparing upload for plate solving...');

    const formData = new FormData();

    if (hints.types && hints.types.length > 0) {
      formData.append('types', hints.types.join(','));
    }

    formData.append('image', file);

    onProgress?.('Astrometry.net is solving your image...');

    try {
      const result = await firstValueFrom(
        this.http.post<AstrosolveSolveResponse>(
          `${this.baseUrl.replace(' ', '/')}/solve`,
          formData,
        ),
      );

      onProgress?.('Solve successful! Identifying objects...');
      return result;
    } catch (error: any) {
      const errorMsg = error.error?.error || error.message || 'Unknown error occurred';
      throw new Error(`Astrosolve failed: ${errorMsg}`);
    }
  }
}
