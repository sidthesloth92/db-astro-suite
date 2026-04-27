import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccessKeyError } from './astrosolve.error';
import { AstrosolveError } from './astrosolve-server.error';
import { AstrosolveSolveResponse } from './astrosolve.model';

@Injectable({
  providedIn: 'root',
})
export class AstrosolveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;
  private readonly ACCESS_KEY_STORAGE_KEY = 'astrosolve_access_key';

  hasAccessKey(): boolean {
    return localStorage.getItem(this.ACCESS_KEY_STORAGE_KEY) !== null;
  }

  saveAccessKey(key: string): void {
    localStorage.setItem(this.ACCESS_KEY_STORAGE_KEY, key);
  }

  clearAccessKey(): void {
    localStorage.removeItem(this.ACCESS_KEY_STORAGE_KEY);
  }

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

    const accessKey = localStorage.getItem(this.ACCESS_KEY_STORAGE_KEY);
    const headers = new HttpHeaders(
      accessKey ? { 'x-access-key': accessKey } : {},
    );

    try {
      const result = await firstValueFrom(
        this.http.post<AstrosolveSolveResponse>(`${this.baseUrl}/solve`, formData, { headers }),
      );

      onProgress?.('Solve successful! Identifying objects...');
      return result;
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
