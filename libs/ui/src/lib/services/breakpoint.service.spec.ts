import { TestBed } from '@angular/core/testing';
import { BreakpointService, MOBILE_BREAKPOINT_PX } from './breakpoint.service';

describe('BreakpointService', () => {
  let service: BreakpointService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BreakpointService);
  });

  it('should be created with isMobile defaulting to false', () => {
    expect(service).toBeTruthy();
    // afterNextRender has not run yet in the unit test scheduler context.
    expect(service.isMobile()).toBe(false);
  });

  it('should flip isMobile to true when width is below the breakpoint', () => {
    service.updateFromWidth(MOBILE_BREAKPOINT_PX - 1);
    expect(service.isMobile()).toBe(true);
  });

  it('should flip isMobile back to false when width is at or above the breakpoint', () => {
    service.updateFromWidth(MOBILE_BREAKPOINT_PX - 1);
    expect(service.isMobile()).toBe(true);
    service.updateFromWidth(MOBILE_BREAKPOINT_PX);
    expect(service.isMobile()).toBe(false);
  });

  it('should remain stable when called repeatedly with the same side of the breakpoint', () => {
    service.updateFromWidth(320);
    service.updateFromWidth(420);
    service.updateFromWidth(500);
    expect(service.isMobile()).toBe(true);
  });
});
