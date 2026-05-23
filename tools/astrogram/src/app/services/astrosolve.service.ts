import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STORAGE_SERVICE_TOKEN } from '@db-astro-suite/ui';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { readImageDimensions } from '../utils/image-dimensions.util';
import {
  ACCESS_KEY_STORAGE_KEY,
  FALLBACK_UPLOAD_LIMITS,
  SOFT_SIZE_RATIO,
} from './astrosolve.constants';
import { AccessKeyError } from './models/access-key.error';
import { AstrosolveError } from './models/astrosolve.error';
import { AstroSolveApiResponse, AstroSolveResponse } from './models/astrosolve.response';
import { UploadLimits, UploadValidation } from './models/upload-limits.model';

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

  // Cached for the session — limits change rarely (env-tunable on the
  // server) and the payload is tiny. In-flight requests share a single
  // promise so concurrent callers don't fan out into duplicate HTTP hits.
  private limitsCache: UploadLimits | null = null;
  private limitsInflight: Promise<UploadLimits> | null = null;

  /** True when an access key is currently persisted in browser storage. */
  hasAccessKey(): boolean {
    return this.storage.getItem(ACCESS_KEY_STORAGE_KEY) !== null;
  }

  /**
   * Loads upload limits from the server, caching the result for the
   * remainder of the session. Falls back to baked-in defaults if the
   * endpoint cannot be reached so the UI hint and pre-upload validation
   * still work offline / during a network blip.
   */
  async loadLimits(): Promise<UploadLimits> {
    if (this.limitsCache) return this.limitsCache;
    if (this.limitsInflight) return this.limitsInflight;
    this.limitsInflight = firstValueFrom(
      this.http.get<UploadLimits>(`${this.baseUrl}/limits`),
    )
      .then((limits) => {
        this.limitsCache = limits;
        return limits;
      })
      .catch(() => {
        this.limitsCache = FALLBACK_UPLOAD_LIMITS;
        return FALLBACK_UPLOAD_LIMITS;
      })
      .finally(() => {
        this.limitsInflight = null;
      });
    return this.limitsInflight;
  }

  /**
   * Returns a human-readable summary of the current limits suitable for
   * placing under the file picker as a hint line.
   */
  formatLimitsHint(limits: UploadLimits): string {
    const maxMb = Math.round(limits.maxBytes / (1024 * 1024));
    const exts = limits.allowedExtensions
      .map((e) => e.replace(/^\./, '').toUpperCase())
      .join('/');
    return `${exts} · max ${maxMb} MB · ${limits.minDimension}×${limits.minDimension} to ${limits.maxDimension}×${limits.maxDimension}`;
  }

  /**
   * Runs the same checks the server will run, before the upload starts,
   * so the user gets instant feedback instead of waiting for the bytes
   * to travel. Returns `{ ok: true }` (with an optional soft warning) or
   * a structured failure describing what to surface in the UI.
   */
  async validateForUpload(file: File): Promise<UploadValidation> {
    const limits = await this.loadLimits();

    const lowerName = file.name.toLowerCase();
    const ext = lowerName.includes('.')
      ? lowerName.slice(lowerName.lastIndexOf('.'))
      : '';
    if (!limits.allowedExtensions.includes(ext)) {
      return {
        ok: false,
        kind: 'format',
        reason: `Only ${limits.allowedExtensions.join(', ')} files are accepted.`,
      };
    }

    if (file.size > limits.maxBytes) {
      const maxMb = Math.round(limits.maxBytes / (1024 * 1024));
      return {
        ok: false,
        kind: 'size',
        reason: `File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed is ${maxMb} MB.`,
      };
    }

    const dimensions = await readImageDimensions(file).catch(() => null);
    if (!dimensions) {
      return {
        ok: false,
        kind: 'format',
        reason: 'Could not read image dimensions. The file may be corrupted.',
      };
    }
    const { width, height } = dimensions;
    if (width < limits.minDimension || height < limits.minDimension) {
      return {
        ok: false,
        kind: 'dimension',
        reason: `Image is ${width}×${height}. Minimum ${limits.minDimension}×${limits.minDimension} required for a reliable plate solve.`,
      };
    }
    if (width > limits.maxDimension || height > limits.maxDimension) {
      return {
        ok: false,
        kind: 'dimension',
        reason: `Image is ${width}×${height}. Maximum ${limits.maxDimension}×${limits.maxDimension} allowed.`,
      };
    }

    if (file.size > limits.maxBytes * SOFT_SIZE_RATIO) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        ok: true,
        softWarning: `This is a large file (${sizeMb} MB). The plate solve may take a while.`,
      };
    }

    return { ok: true };
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
