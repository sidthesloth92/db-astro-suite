import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService, BreakpointService } from '@db-astro-suite/ui';
import { App } from './app';
import { DesktopShellComponent } from './layout/desktop-shell/desktop-shell.component';
import { MobileShellComponent } from './layout/mobile-shell/mobile-shell.component';

@Component({
  selector: 'dba-ag-desktop-shell',
  template: '<div class="desktop-stub"></div>',
  standalone: true,
})
class DesktopShellStub {}

@Component({
  selector: 'dba-ag-mobile-shell',
  template: '<div class="mobile-stub"></div>',
  standalone: true,
})
class MobileShellStub {}

function makeAnalyticsStub(): Record<string, jasmine.Spy> {
  return new Proxy({} as Record<string, jasmine.Spy>, {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = jasmine.createSpy(prop);
      }
      return target[prop];
    },
  });
}

describe('App', () => {
  let breakpoint: { isMobile: ReturnType<typeof signal<boolean>> };

  beforeEach(async () => {
    breakpoint = { isMobile: signal(false) };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: BreakpointService, useValue: breakpoint },
        { provide: AnalyticsService, useValue: makeAnalyticsStub() },
      ],
    })
      .overrideComponent(App, {
        remove: { imports: [DesktopShellComponent, MobileShellComponent] },
        add: { imports: [DesktopShellStub, MobileShellStub] },
      })
      .compileComponents();
  });

  it('renders the desktop shell when the viewport is wide', () => {
    breakpoint.isMobile.set(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.desktop-stub')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.mobile-stub')).toBeFalsy();
  });

  it('renders the mobile shell when the viewport is narrow', () => {
    breakpoint.isMobile.set(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.mobile-stub')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.desktop-stub')).toBeFalsy();
  });
});
