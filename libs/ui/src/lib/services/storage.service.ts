import { InjectionToken } from '@angular/core';

/**
 * Abstract storage service defining the key–value storage contract.
 * Implement this class and provide it via `STORAGE_SERVICE_TOKEN` to swap
 * storage backends without changing consumers.
 */
export abstract class StorageService {
  /** Retrieves the value stored under the given key, or `null` if not found. */
  abstract getItem(key: string): string | null;
  /** Stores the given string value under the given key. */
  abstract setItem(key: string, value: string): void;
  /** Removes the entry associated with the given key. */
  abstract removeItem(key: string): void;
}

/** Injection token for `StorageService`. Provide with `useClass: LocalStorageService` (or another implementation) in `app.config.ts`. */
export const STORAGE_SERVICE_TOKEN = new InjectionToken<StorageService>('StorageService');
