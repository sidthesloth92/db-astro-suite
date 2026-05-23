import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STORAGE_SERVICE_TOKEN } from '@db-astro-suite/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ACCESS_KEY_STORAGE_KEY } from './astrosolve.constants';
import { AccessKeyError } from './models/access-key.error';
import { AstrosolveError } from './models/astrosolve.error';
import { AstroSolveApiResponse, AstroSolveResponse } from './models/astrosolve.response';

/**
 * Client for the Astrosolve plate-solving backend. Persists the user's
 * access key to browser storage (via the injected storage service) and
 * attaches it as the `x-access-key` header on outgoing solve requests.
 */
@Injectable({
  providedIn: 'root',
})
export class AstrosolveService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(STORAGE_SERVICE_TOKEN);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  /** True when an access key is currently persisted in browser storage. */
  hasAccessKey(): boolean {
    return this.storage.getItem(ACCESS_KEY_STORAGE_KEY) !== null;
  }

  /** Persists the supplied access key to browser storage. */
  saveAccessKey(key: string): void {
    this.storage.setItem(ACCESS_KEY_STORAGE_KEY, key);
  }

  /** Removes any persisted access key from browser storage. */
  clearAccessKey(): void {
    this.storage.removeItem(ACCESS_KEY_STORAGE_KEY);
  }

  /**
   * Upload an image to the local Astrosolve API for fast plate solving.
   * Maps the raw API response to the `AstroSolveResponse` domain model before returning.
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
    accessKey?: string,
  ): Promise<AstroSolveResponse> {
    onProgress?.('Preparing upload for plate solving...');

    const formData = new FormData();

    if (hints.types && hints.types.length > 0) {
      formData.append('types', hints.types.join(','));
    }

    formData.append('image', file);

    onProgress?.('Astrometry.net is solving your image...');

    const keyToUse = accessKey ?? this.storage.getItem(ACCESS_KEY_STORAGE_KEY);
    const headers = new HttpHeaders(keyToUse ? { 'x-access-key': keyToUse } : {});

    try {
      const response = await firstValueFrom(
        this.http.post<AstroSolveApiResponse>(`${this.baseUrl}/solve`, formData, { headers }),
      );

      onProgress?.('Solve successful! Identifying objects...');
      return response.details;
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
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
