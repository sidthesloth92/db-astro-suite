import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { AnalyticsService } from '../services/analytics.service';
import { STORAGE_SERVICE_TOKEN, StorageService } from '../services/storage.service';
import { SharePromptConfig } from './share-prompt-config.model';
import { SHARE_PROMPT_CONFIG } from './share-prompt.config';
import { SHARE_PROMPT_SHOW_DELAY_MS, SHARE_PROMPT_SNOOZE_EXPORTS } from './share-prompt.constants';
import { SharePromptService } from './share-prompt.service';

const CONFIG: SharePromptConfig = {
  appName: 'Astrogram',
  appHashtag: '#astrogram',
  itemNoun: 'card',
  storageKey: 'astrogram.sharePrompt',
};

/** In-memory storage double. */
class MemoryStorage implements StorageService {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('SharePromptService', () => {
  let storage: MemoryStorage;
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let writeText: jasmine.Spy;

  function setup(config: SharePromptConfig | null = CONFIG): SharePromptService {
    TestBed.configureTestingModule({
      providers: [
        { provide: SHARE_PROMPT_CONFIG, useValue: config },
        { provide: STORAGE_SERVICE_TOKEN, useValue: storage },
        { provide: AnalyticsService, useValue: analytics },
      ],
    });
    return TestBed.inject(SharePromptService);
  }

  beforeEach(() => {
    storage = new MemoryStorage();
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackEvent']);
    writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
  });

  it('should open shortly after the first successful export, not immediately', fakeAsync(() => {
    const service = setup();
    service.notifyExportSucceeded();
    expect(service.isOpen()).toBeFalse();
    tick(SHARE_PROMPT_SHOW_DELAY_MS);
    expect(service.isOpen()).toBeTrue();
    expect(analytics.trackEvent).toHaveBeenCalledWith('share_prompt_shown', { app: 'Astrogram' });
  }));

  /** Opens the prompt via a first export and waits out the show delay. */
  function openPrompt(service: SharePromptService): void {
    service.notifyExportSucceeded();
    tick(SHARE_PROMPT_SHOW_DELAY_MS);
  }

  /** Simulates a reload: a fresh service reading the same storage. */
  function reload(): SharePromptService {
    TestBed.resetTestingModule();
    return setup();
  }

  it('should show only once per visit, however many exports follow', fakeAsync(() => {
    const service = setup();
    openPrompt(service);
    service.dismiss();
    openPrompt(service);
    openPrompt(service);
    expect(service.isOpen()).toBeFalse();
    expect(analytics.trackEvent).toHaveBeenCalledWith('share_prompt_closed', { app: 'Astrogram' });
  }));

  it('should show again on the next visit after being closed', fakeAsync(() => {
    const first = setup();
    openPrompt(first);
    first.dismiss();

    const next = reload();
    openPrompt(next);
    expect(next.isOpen()).toBeTrue();
  }));

  it('should skip the next exports, even across visits, after "Maybe later"', fakeAsync(() => {
    const first = setup();
    openPrompt(first);
    first.snooze();
    expect(first.isOpen()).toBeFalse();
    expect(analytics.trackEvent).toHaveBeenCalledWith('share_prompt_later', { app: 'Astrogram' });

    const next = reload();
    for (let i = 0; i < SHARE_PROMPT_SNOOZE_EXPORTS; i++) {
      openPrompt(next);
      expect(next.isOpen()).toBeFalse();
    }
    openPrompt(next);
    expect(next.isOpen()).toBeTrue();
  }));

  it('should copy every tag and still show on the next visit', fakeAsync(() => {
    const service = setup();
    openPrompt(service);
    void service.copyTags();
    flushMicrotasks();
    expect(writeText).toHaveBeenCalledWith('#dbastrosuite #astrogram @astrowithdb');
    expect(service.copyStatus()).toBe('copied');
    expect(service.copiedTags()).toEqual(service.tags);
    service.dismiss();

    const next = reload();
    openPrompt(next);
    expect(next.isOpen()).toBeTrue();
    expect(next.copyStatus()).toBe('idle');
  }));

  it('should copy a single tag and only thank the user once every tag is copied', fakeAsync(() => {
    const service = setup();
    service.notifyExportSucceeded();
    tick(SHARE_PROMPT_SHOW_DELAY_MS);

    void service.copyTag('#astrogram');
    flushMicrotasks();
    expect(writeText).toHaveBeenCalledWith('#astrogram');
    expect(service.copiedTags()).toEqual(['#astrogram']);
    expect(service.copyStatus()).toBe('idle');

    void service.copyTag('#dbastrosuite');
    void service.copyTag('@astrowithdb');
    flushMicrotasks();
    expect(service.copyStatus()).toBe('copied');
  }));

  it('should report a failed copy so the user can copy by hand', fakeAsync(() => {
    writeText.and.rejectWith(new DOMException('denied', 'NotAllowedError'));
    spyOn(console, 'warn');
    const service = setup();
    void service.copyTags();
    flushMicrotasks();
    expect(service.copyStatus()).toBe('failed');
  }));

  it('should never show again, even on later visits, once the user opts out', fakeAsync(() => {
    const service = setup();
    openPrompt(service);
    service.optOut();
    expect(service.isOpen()).toBeFalse();
    const next = reload();
    openPrompt(next);
    expect(next.isOpen()).toBeFalse();
    expect(analytics.trackEvent).toHaveBeenCalledWith('share_prompt_opt_out', { app: 'Astrogram' });
  }));

  it('should do nothing when the app has not opted in', fakeAsync(() => {
    const service = setup(null);
    service.notifyExportSucceeded();
    tick(SHARE_PROMPT_SHOW_DELAY_MS);
    expect(service.isOpen()).toBeFalse();
    expect(storage.values.size).toBe(0);
    expect(analytics.trackEvent).not.toHaveBeenCalled();
  }));

  it('should keep working in memory when storage throws', fakeAsync(() => {
    spyOn(storage, 'getItem').and.throwError('blocked');
    spyOn(storage, 'setItem').and.throwError('blocked');
    spyOn(console, 'warn');
    const service = setup();
    service.notifyExportSucceeded();
    tick(SHARE_PROMPT_SHOW_DELAY_MS);
    expect(service.isOpen()).toBeTrue();
  }));
});
