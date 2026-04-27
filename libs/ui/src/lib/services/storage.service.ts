import { InjectionToken } from '@angular/core';

export abstract class StorageService {
  abstract getItem(key: string): string | null;
  abstract setItem(key: string, value: string): void;
  abstract removeItem(key: string): void;
}

export const STORAGE_SERVICE_TOKEN = new InjectionToken<StorageService>('StorageService');
