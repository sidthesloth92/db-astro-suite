import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { STORAGE_SERVICE_TOKEN, type StorageService } from '@db-astro-suite/ui';
import { environment } from '../../environments/environment';
import { AstrosolveService } from './astrosolve.service';
import { FovPreset } from './models/fov-preset.enum';

/**
 * Tests for the AstrosolveService solve request wiring — specifically that
 * the FOV preset is forwarded to the backend as the `fov_preset` multipart
 * field (and omitted for the Auto default).
 */
describe('AstrosolveService.solveImage', () => {
  const SOLVE_URL = `${environment.apiBaseUrl}/api/v1/solve`;
  let service: AstrosolveService;
  let httpMock: HttpTestingController;

  const storageStub: StorageService = {
    getItem: (): string | null => 'test-key',
    setItem: (): void => undefined,
    removeItem: (): void => undefined,
  };

  const file = new File(['data'], 'shot.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: STORAGE_SERVICE_TOKEN, useValue: storageStub },
      ],
    });
    service = TestBed.inject(AstrosolveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushSolve(): FormData {
    const req = httpMock.expectOne(SOLVE_URL);
    const body = req.request.body as FormData;
    req.flush({ details: { metadata: {}, objects: [] } });
    return body;
  }

  it('appends fov_preset when a non-Auto preset is supplied', async () => {
    const promise = service.solveImage(file, { fovPreset: FovPreset.Narrow });
    const body = flushSolve();
    await promise;
    expect(body.get('fov_preset')).toBe('narrow');
  });

  it('omits fov_preset for the Auto default', async () => {
    const promise = service.solveImage(file, { fovPreset: FovPreset.Auto });
    const body = flushSolve();
    await promise;
    expect(body.get('fov_preset')).toBeNull();
  });

  it('omits fov_preset when no preset is supplied', async () => {
    const promise = service.solveImage(file, {});
    const body = flushSolve();
    await promise;
    expect(body.get('fov_preset')).toBeNull();
  });
});
