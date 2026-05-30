import { TestBed } from '@angular/core/testing';
import { ExportCoordinatorService } from './export-coordinator.service';

describe('ExportCoordinatorService', () => {
  let service: ExportCoordinatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportCoordinatorService);
  });

  it('does nothing when triggered with no exporter registered', () => {
    expect(() => service.trigger()).not.toThrow();
  });

  it('invokes the registered exporter on trigger', () => {
    const exporter = jasmine.createSpy('exporter');
    service.register(exporter);
    service.trigger();
    expect(exporter).toHaveBeenCalledTimes(1);
  });

  it('replaces the exporter when register is called twice', () => {
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    service.register(first);
    service.register(second);
    service.trigger();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears the slot on unregister', () => {
    const exporter = jasmine.createSpy('exporter');
    const unregister = service.register(exporter);
    unregister();
    service.trigger();
    expect(exporter).not.toHaveBeenCalled();
  });

  it('leaves the current exporter intact when a stale unregister is invoked', () => {
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    const unregisterFirst = service.register(first);
    service.register(second);
    unregisterFirst();
    service.trigger();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('returns a function from register so callers can unregister on destroy', () => {
    const unregister = service.register(() => undefined);
    expect(typeof unregister).toBe('function');
  });

  it('invokes the registered exporter once per trigger call', () => {
    const exporter = jasmine.createSpy('exporter');
    service.register(exporter);
    service.trigger();
    service.trigger();
    service.trigger();
    expect(exporter).toHaveBeenCalledTimes(3);
  });

  it('treats trigger after a stale unregister-only sequence as a no-op', () => {
    const first = jasmine.createSpy('first');
    const unregister = service.register(first);
    unregister();
    service.trigger();
    expect(first).not.toHaveBeenCalled();
  });
});
