import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STORAGE_SERVICE_TOKEN } from '@db-astro-suite/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessKeyError } from './models/access-key.error';
import { AstrosolveError } from './models/astrosolve.error';
import { AstroSolveResponse, SolveData } from './models/astrosolve.response';

@Injectable({
  providedIn: 'root',
})
export class AstrosolveService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(STORAGE_SERVICE_TOKEN);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;
  private readonly ACCESS_KEY_STORAGE_KEY = 'astrosolve_access_key';

  hasAccessKey(): boolean {
    return this.storage.getItem(this.ACCESS_KEY_STORAGE_KEY) !== null;
  }

  saveAccessKey(key: string): void {
    this.storage.setItem(this.ACCESS_KEY_STORAGE_KEY, key);
  }

  clearAccessKey(): void {
    this.storage.removeItem(this.ACCESS_KEY_STORAGE_KEY);
  }

  /**
   * Upload an image to the local Astrosolve API for fast plate solving.
   * Maps the raw API response to the `SolveData` domain model before returning.
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
  ): Promise<SolveData> {
    onProgress?.('Preparing upload for plate solving...');

    const formData = new FormData();

    if (hints.types && hints.types.length > 0) {
      formData.append('types', hints.types.join(','));
    }

    formData.append('image', file);

    onProgress?.('Astrometry.net is solving your image...');

    const accessKey = this.storage.getItem(this.ACCESS_KEY_STORAGE_KEY);
    const headers = new HttpHeaders(accessKey ? { 'x-access-key': accessKey } : {});

    try {
      const response = await firstValueFrom(
        this.http.post<AstroSolveResponse>(`${this.baseUrl}/solve`, formData, { headers }),
      );

      onProgress?.('Solve successful! Identifying objects...');
      return response.details;
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.clearAccessKey();
        throw new AccessKeyError();
      }
      const httpError = error instanceof HttpErrorResponse ? error : null;
      const errorMsg =
        httpError?.error?.message ||
        (error instanceof Error ? error.message : undefined) ||
        'Unknown error occurred';
      throw new AstrosolveError(`Astrosolve failed: ${errorMsg}`);
    }
  }
}
