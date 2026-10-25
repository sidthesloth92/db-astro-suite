import '@angular/compiler';
import { DOCUMENT } from '@angular/common';
import { Injector, PLATFORM_ID } from '@angular/core';
import { STORAGE_SERVICE_TOKEN, type StorageService } from '@db-astro-suite/ui';
import { describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY } from '../models/analytics-consent.constants';
import { AnalyticsConsentStore } from './analytics-consent-store.service';

function fakeStorage(initial: Record<string, string> = {}): StorageService {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

function setup(options: { storage?: StorageService; platform?: string } = {}) {
  const storage = options.storage ?? fakeStorage();
  const win = { celestoryLoadAnalytics: vi.fn(), gtag: vi.fn() };
  const injector = Injector.create({
    providers: [
      { provide: AnalyticsConsentStore, deps: [] },
      { provide: STORAGE_SERVICE_TOKEN, useValue: storage },
      { provide: DOCUMENT, useValue: { defaultView: win } },
      { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
    ],
  });
  return { store: injector.get(AnalyticsConsentStore), storage, win };
}

describe('AnalyticsConsentStore', () => {
  it('should ask on a first visit', () => {
    const { store } = setup();
    store.init();
    expect(store.promptOpen()).toBe(true);
    expect(store.choice()).toBeNull();
  });

  it('should not ask again once a choice is saved', () => {
    const { store } = setup({ storage: fakeStorage({ [ANALYTICS_CONSENT_KEY]: 'denied' }) });
    store.init();
    expect(store.promptOpen()).toBe(false);
    expect(store.choice()).toBe('denied');
  });

  it('should never open the prompt while rendering on the server', () => {
    const { store } = setup({ platform: 'server' });
    store.init();
    expect(store.promptOpen()).toBe(false);
  });

  it('should save an accept and load analytics', () => {
    const { store, storage, win } = setup();
    store.init();
    store.accept();
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
    expect(store.promptOpen()).toBe(false);
    expect(win.celestoryLoadAnalytics).toHaveBeenCalledOnce();
  });

  it('should save a decline without loading analytics', () => {
    const { store, storage, win } = setup();
    store.init();
    store.decline();
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
    expect(win.celestoryLoadAnalytics).not.toHaveBeenCalled();
    expect(win.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });

  it('should reopen the prompt from analytics settings', () => {
    const { store } = setup({ storage: fakeStorage({ [ANALYTICS_CONSENT_KEY]: 'granted' }) });
    store.init();
    store.reopen();
    expect(store.promptOpen()).toBe(true);
  });

  it('should keep the choice for the visit when storage is blocked', () => {
    const blocked: StorageService = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { store } = setup({ storage: blocked });
    store.init();
    expect(store.promptOpen()).toBe(true);
    store.accept();
    expect(store.choice()).toBe('granted');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
