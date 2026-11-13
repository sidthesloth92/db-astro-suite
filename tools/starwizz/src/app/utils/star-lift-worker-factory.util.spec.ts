import { createStarLiftWorker } from './star-lift-worker-factory.util';

describe('createStarLiftWorker', () => {
  it('should report that no worker is available where the browser has none', () => {
    // Justification for the cast: the spec temporarily removes a global the DOM typings
    // declare as always present.
    const scope = globalThis as unknown as { Worker: typeof Worker | undefined };
    const original = scope.Worker;
    scope.Worker = undefined;
    try {
      expect(createStarLiftWorker()).toBeNull();
    } finally {
      scope.Worker = original;
    }
  });

  it('should fall back quietly, with a warning, when the worker cannot be constructed', () => {
    const warn = spyOn(console, 'warn');
    // Justification for the cast: the spec swaps in a constructor that always throws.
    const scope = globalThis as unknown as { Worker: unknown };
    const original = scope.Worker;
    scope.Worker = class {
      constructor() {
        throw new Error('blocked');
      }
    };
    try {
      expect(createStarLiftWorker()).toBeNull();
      expect(warn).toHaveBeenCalled();
    } finally {
      scope.Worker = original;
    }
  });

  it('should create a worker where the browser supports them', () => {
    const worker = createStarLiftWorker();
    expect(worker).not.toBeNull();
    worker?.terminate();
  });
});
