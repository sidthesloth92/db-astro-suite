import { TestBed } from '@angular/core/testing';
import { GoogleAnalyticsTrackerService } from './google-analytics-tracker.service';

describe('GoogleAnalyticsTrackerService', () => {
  let service: GoogleAnalyticsTrackerService;
  let gtagMock: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GoogleAnalyticsTrackerService],
    });
    service = TestBed.inject(GoogleAnalyticsTrackerService);
  });

  afterEach(() => {
    // Clean up any mocked gtag
    if ('gtag' in window) {
      delete (window as unknown as { gtag?: unknown }).gtag;
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackImageGeneration', () => {
    it('should send image_generation event to gtag with correct parameters', () => {
      // Setup gtag mock
      gtagMock = jasmine.createSpy('gtag');
      (window as unknown as { gtag: jasmine.Spy }).gtag = gtagMock;

      const userId = 'user-123';
      const toolsUsed = 'astrosolve, wcs-projection';

      service.trackImageGeneration(userId, toolsUsed);

      expect(gtagMock).toHaveBeenCalledWith('event', 'image_generation', {
        user_id: userId,
        tools_used: toolsUsed,
      });
    });

    it('should gracefully handle missing gtag (ad-blocker scenario)', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');

      // Ensure gtag is not available
      if ('gtag' in window) {
        delete (window as unknown as { gtag?: unknown }).gtag;
      }

      // Should not throw
      expect(() => service.trackImageGeneration('user-123', 'astrosolve')).not.toThrow();

      // Should have logged a warning
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/gtag not available/),
      );
    });

    it('should catch and log errors thrown by gtag', () => {
      spyOn(console, 'error');

      // Setup gtag to throw an error
      gtagMock = jasmine.createSpy('gtag').and.throwError('Invalid parameter');
      (window as unknown as { gtag: jasmine.Spy }).gtag = gtagMock;

      // Should not throw to caller
      expect(() => service.trackImageGeneration('user-123', 'astrosolve')).not.toThrow();

      // Should have logged the error
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Failed to send event/),
        jasmine.any(Error),
      );
    });
  });

  describe('trackVideoGeneration', () => {
    it('should send video_generation event to gtag with correct parameters', () => {
      gtagMock = jasmine.createSpy('gtag');
      (window as unknown as { gtag: jasmine.Spy }).gtag = gtagMock;

      const userId = 'user-456';
      const format = '9:16';

      service.trackVideoGeneration(userId, format);

      expect(gtagMock).toHaveBeenCalledWith('event', 'video_generation', {
        user_id: userId,
        format,
      });
    });

    it('should gracefully handle missing gtag', () => {
      spyOn(console, 'warn');

      if ('gtag' in window) {
        delete (window as unknown as { gtag?: unknown }).gtag;
      }

      expect(() => service.trackVideoGeneration('user-456', 'mp4')).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/gtag not available/),
      );
    });

    it('should catch and log errors thrown by gtag', () => {
      spyOn(console, 'error');

      gtagMock = jasmine.createSpy('gtag').and.throwError('gtag failed');
      (window as unknown as { gtag: jasmine.Spy }).gtag = gtagMock;

      expect(() => service.trackVideoGeneration('user-456', 'mp4')).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching(/Failed to send event/),
        jasmine.any(Error),
      );
    });
  });

  describe('event parameter format', () => {
    it('should send parameters as an object with snake_case keys', () => {
      gtagMock = jasmine.createSpy('gtag');
      (window as unknown as { gtag: jasmine.Spy }).gtag = gtagMock;

      service.trackImageGeneration('user-789', 'tool1, tool2');

      const call = gtagMock.calls.mostRecent();
      expect(call.args[0]).toBe('event');
      expect(call.args[1]).toBe('image_generation');
      expect(call.args[2]).toEqual(jasmine.objectContaining({
        user_id: 'user-789',
        tools_used: 'tool1, tool2',
      }));
    });
  });
});
