import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { GoogleAnalyticsService } from './google-analytics.service';

describe('GoogleAnalyticsService', () => {
  let service: GoogleAnalyticsService;
  let gtag: jasmine.Spy;

  beforeEach(() => {
    gtag = jasmine.createSpy('gtag');
    TestBed.configureTestingModule({
      providers: [
        GoogleAnalyticsService,
        { provide: DOCUMENT, useValue: { defaultView: { gtag } } },
      ],
    });
    service = TestBed.inject(GoogleAnalyticsService);
  });

  it('should send the Starwizz video event with its format and no shared user id', () => {
    service.trackVideoGeneration('mp4');

    expect(gtag).toHaveBeenCalledOnceWith('event', 'starwizz_video_generation', {
      format: 'mp4',
    });
  });

  it('should send the Astrogram solve event with the tools used and no shared user id', () => {
    service.trackImageGeneration('plate-solve,wcs-projection,12-objects');

    expect(gtag).toHaveBeenCalledOnceWith('event', 'astrogram_astrosolve_success', {
      tools_used: 'plate-solve,wcs-projection,12-objects',
    });
  });

  it('should do nothing when gtag is unavailable', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [GoogleAnalyticsService, { provide: DOCUMENT, useValue: { defaultView: {} } }],
    });
    const offline = TestBed.inject(GoogleAnalyticsService);

    expect(() => offline.trackVideoGeneration('webm')).not.toThrow();
  });
});
