import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InAppBrowserAlert } from './in-app-browser-alert';

describe('InAppBrowserAlert', () => {
  let fixture: ComponentFixture<InAppBrowserAlert>;

  function render(appName: string, externalBrowserUrl: string | null): HTMLElement {
    fixture = TestBed.createComponent(InAppBrowserAlert);
    fixture.componentRef.setInput('appName', appName);
    fixture.componentRef.setInput('externalBrowserUrl', externalBrowserUrl);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should explain that the named app’s browser cannot save videos', () => {
    const host = render('Instagram', null);

    expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'Instagram’s built-in browser can’t save the videos you record',
    );
  });

  it('should offer a link that opens the page in the browser when one exists', () => {
    const intentUrl = 'intent://dbastrosuite.com/starwizz/#Intent;scheme=https;end';
    const host = render('Instagram', intentUrl);

    const link = host.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Open in browser');
    expect(link?.getAttribute('href')).toBe(intentUrl);
  });

  it('should keep the app’s own open-externally link intact on iOS', () => {
    const iosUrl = 'instagram://extbrowser/?url=https%3A%2F%2Fdbastrosuite.com%2Fstarwizz%2F';
    const host = render('Instagram', iosUrl);

    expect(host.querySelector('a')?.getAttribute('href')).toBe(iosUrl);
  });

  it('should still explain the manual route when no link exists', () => {
    const host = render('Facebook', null);

    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent).toContain('Tap the menu at the top right');
  });

  it('should offer no way to dismiss the alert', () => {
    const host = render('Instagram', null);

    expect(host.querySelector('button')).toBeNull();
  });
});
