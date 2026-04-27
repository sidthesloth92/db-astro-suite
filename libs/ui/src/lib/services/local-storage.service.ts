import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

/**
 * Concrete `StorageService` implementation backed by `window.localStorage`.
 * Provided at the app level via `STORAGE_SERVICE_TOKEN` in `app.config.ts`.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService implements StorageService {
  /** Retrieves the value stored under the given key from `localStorage`, or `null` if not found. */
  getItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  /** Stores the given string value under the given key in `localStorage`. */
  setItem(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }

  /** Removes the entry associated with the given key from `localStorage`. */
  removeItem(key: string): void {
    window.localStorage.removeItem(key);
  }
}
