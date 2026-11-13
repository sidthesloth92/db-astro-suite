import { buildExternalBrowserUrl, detectInAppBrowser } from './in-app-browser.util';

const INSTAGRAM_ANDROID =
  'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro Build/BP2A.250805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.51 Mobile Safari/537.36 Instagram 398.0.0.45.118 Android (36/16; 480dpi; 1280x2856; Google/google; Pixel 10 Pro; blazer; blazer; en_US; 771234567)';
const INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86 Instagram 398.0.0.25.82 (iPhone17,2; iOS 18_6; en_US; en; scale=3.00; 1320x2868; 771234567)';
const THREADS_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; SM-S928B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36 Barcelona 395.0.0.40.109 Android (35/15; 450dpi; 1080x2340; samsung; SM-S928B; e3q; qcom; en_US; 761234567)';
const FACEBOOK_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; SM-A546B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/530.0.0.48.74;]';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1';
const CHROME_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

describe('in-app-browser.util', () => {
  describe('detectInAppBrowser', () => {
    it('should recognise Instagram on Android', () => {
      expect(detectInAppBrowser(INSTAGRAM_ANDROID)).toEqual({
        appName: 'Instagram',
        platform: 'android',
      });
    });

    it('should recognise Instagram on iOS', () => {
      expect(detectInAppBrowser(INSTAGRAM_IOS)).toEqual({ appName: 'Instagram', platform: 'ios' });
    });

    it('should recognise Threads and Facebook', () => {
      expect(detectInAppBrowser(THREADS_ANDROID)?.appName).toBe('Threads');
      expect(detectInAppBrowser(FACEBOOK_ANDROID)?.appName).toBe('Facebook');
    });

    it('should not flag regular browsers', () => {
      expect(detectInAppBrowser(CHROME_ANDROID)).toBeNull();
      expect(detectInAppBrowser(CHROME_IOS)).toBeNull();
      expect(detectInAppBrowser(CHROME_DESKTOP)).toBeNull();
      expect(detectInAppBrowser('')).toBeNull();
    });
  });

  describe('buildExternalBrowserUrl', () => {
    it('should build a default-browser intent link with a fallback on Android', () => {
      const url = buildExternalBrowserUrl(
        { appName: 'Instagram', platform: 'android' },
        'https://dbastrosuite.com/starwizz/?utm_source=ig#top',
      );

      expect(url).toBe(
        'intent://dbastrosuite.com/starwizz/?utm_source=ig#Intent;scheme=https;' +
          'action=android.intent.action.VIEW;' +
          'S.browser_fallback_url=https%3A%2F%2Fdbastrosuite.com%2Fstarwizz%2F%3Futm_source%3Dig;end',
      );
    });

    it('should not pin a specific browser on Android', () => {
      const url = buildExternalBrowserUrl(
        { appName: 'Instagram', platform: 'android' },
        'https://dbastrosuite.com/starwizz/',
      );

      expect(url).not.toContain('package=');
    });

    it("should use the host app's own open-externally scheme on iOS", () => {
      expect(
        buildExternalBrowserUrl(
          { appName: 'Instagram', platform: 'ios' },
          'https://dbastrosuite.com/starwizz/',
        ),
      ).toBe('instagram://extbrowser/?url=https%3A%2F%2Fdbastrosuite.com%2Fstarwizz%2F');
      expect(
        buildExternalBrowserUrl(
          { appName: 'Threads', platform: 'ios' },
          'https://dbastrosuite.com/starwizz/',
        ),
      ).toBe('barcelona://extbrowser/?url=https%3A%2F%2Fdbastrosuite.com%2Fstarwizz%2F');
    });

    it('should fall back to Safari on iOS for apps without their own scheme', () => {
      expect(
        buildExternalBrowserUrl(
          { appName: 'Facebook', platform: 'ios' },
          'https://dbastrosuite.com/starwizz/',
        ),
      ).toBe('x-safari-https://dbastrosuite.com/starwizz/');
    });

    it('should offer no link on other platforms', () => {
      expect(
        buildExternalBrowserUrl(
          { appName: 'Facebook', platform: 'other' },
          'https://dbastrosuite.com/starwizz/',
        ),
      ).toBeNull();
    });
  });
});
