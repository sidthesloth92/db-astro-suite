import { TestBed } from '@angular/core/testing';
import { InAppBrowserService } from './in-app-browser.service';

describe('InAppBrowserService', () => {
  it('should report no in-app browser in a regular browser', () => {
    const service = TestBed.inject(InAppBrowserService);

    expect(service.browser).toBeNull();
    expect(service.externalBrowserUrl).toBeNull();
  });

  it('should report Instagram and a default-browser link inside its Android browser', () => {
    spyOnProperty(window.navigator, 'userAgent', 'get').and.returnValue(
      'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 Instagram 398.0.0.45.118 Android',
    );

    const service = TestBed.inject(InAppBrowserService);

    expect(service.browser).toEqual({ appName: 'Instagram', platform: 'android' });
    expect(service.externalBrowserUrl).toMatch(/^intent:\/\//);
  });

  it('should report Instagram and its open-externally link inside its iOS browser', () => {
    spyOnProperty(window.navigator, 'userAgent', 'get').and.returnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86 Instagram 398.0.0.25.82',
    );

    const service = TestBed.inject(InAppBrowserService);

    expect(service.browser?.platform).toBe('ios');
    expect(service.externalBrowserUrl).toMatch(/^instagram:\/\/extbrowser\/\?url=/);
  });
});
