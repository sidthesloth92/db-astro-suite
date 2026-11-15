import { TestBed } from '@angular/core/testing';
import {
  AIM_LIMIT,
  SCENE3D_CONTROLS,
  SCENE3D_ERROR_PREPARE,
  SCENE3D_ERROR_UNSUPPORTED,
} from '../constants/scene3d.constant';
import { LiftedScene } from '../models/lifted-scene.model';
import { StarLiftError, StarLiftSupersededError } from '../models/star-lift.error';
import { Scene3dService } from './scene3d.service';
import { StarLiftService } from './star-lift.service';

/** Loads a small solid image, standing in for the user's photo. */
function loadImage(color = '#102030'): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 30;
  // Justification for the non-null assertion: a 2D context is always available in the test browser.
  const context = canvas.getContext('2d')!;
  context.fillStyle = color;
  context.fillRect(0, 0, 40, 30);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = canvas.toDataURL('image/png');
  });
}

const SCENE: LiftedScene = {
  width: 40,
  height: 30,
  photo: new Uint8ClampedArray(4),
  starless: new Uint8ClampedArray(4),
  cloudDepth: new Uint8Array(1),
  atlas: new Uint8ClampedArray(4),
  atlasWidth: 1,
  atlasHeight: 1,
  patches: new Float32Array(0),
  stars: new Float32Array(0),
  giants: new Float32Array(0),
};

describe('Scene3dService', () => {
  let service: Scene3dService;
  let lift: jasmine.Spy<StarLiftService['lift']>;
  let cancel: jasmine.Spy<StarLiftService['cancel']>;

  beforeEach(() => {
    lift = jasmine.createSpy('lift');
    cancel = jasmine.createSpy('cancel');
    TestBed.configureTestingModule({
      providers: [{ provide: StarLiftService, useValue: { lift, cancel } }],
    });
    service = TestBed.inject(Scene3dService);
    spyOn(console, 'error');
  });

  describe('preparing a photo', () => {
    it('should show lifting while it works and become ready with the scene', async () => {
      let finish: (scene: LiftedScene) => void = () => undefined;
      lift.and.returnValue(new Promise<LiftedScene>((resolve) => (finish = resolve)));

      const done = service.prepare(await loadImage());
      expect(service.status()).toBe('lifting');
      expect(service.isLifting()).toBeTrue();
      expect(service.isReady()).toBeFalse();

      finish(SCENE);
      await done;
      expect(service.status()).toBe('ready');
      expect(service.scene()).toBe(SCENE);
      expect(lift.calls.mostRecent().args[0].width).toBe(40);
    });

    it('should not lift the same photo twice', async () => {
      lift.and.resolveTo(SCENE);
      const image = await loadImage();
      await service.prepare(image);
      await service.prepare(image);
      expect(lift).toHaveBeenCalledTimes(1);
    });

    it('should show an error the user can read when lifting fails', async () => {
      lift.and.rejectWith(new StarLiftError('worker died'));
      await service.prepare(await loadImage());

      expect(service.status()).toBe('error');
      expect(service.errorMessage()).toBe(SCENE3D_ERROR_PREPARE);
      expect(service.visibleError()).toBe(SCENE3D_ERROR_PREPARE);
      expect(service.scene()).toBeNull();
    });

    it('should show an error instead of throwing when the photo cannot be read', async () => {
      // A broken image has no pixels to copy: the browser throws when it is drawn.
      const broken = new Image();
      await new Promise<void>((resolve) => {
        broken.onerror = () => resolve();
        broken.src = 'data:image/png;base64,AAAA';
      });
      await expectAsync(service.prepare(broken)).toBeResolved();
      expect(service.status()).toBe('error');
      expect(service.visibleError()).toBe(SCENE3D_ERROR_PREPARE);
      expect(lift).not.toHaveBeenCalled();
    });

    it('should let the user retry the same photo after a failure', async () => {
      const image = await loadImage();
      lift.and.rejectWith(new StarLiftError('worker died'));
      await service.prepare(image);
      lift.and.resolveTo(SCENE);
      await service.prepare(image);
      expect(service.status()).toBe('ready');
    });

    it('should stay quiet when a newer photo replaces the one being lifted', async () => {
      const first = await loadImage('#111111');
      const second = await loadImage('#222222');
      lift.and.returnValues(Promise.reject(new StarLiftSupersededError()), Promise.resolve(SCENE));

      const older = service.prepare(first);
      const newer = service.prepare(second);
      await Promise.all([older, newer]);

      expect(service.status()).toBe('ready');
      expect(service.errorMessage()).toBeNull();
    });

    it('should forget the scene when the photo is cleared', async () => {
      lift.and.resolveTo(SCENE);
      await service.prepare(await loadImage());
      service.clearScene();
      expect(service.status()).toBe('idle');
      expect(service.scene()).toBeNull();
    });

    it('should abandon a lift in flight when the photo is cleared', async () => {
      lift.and.returnValue(new Promise<LiftedScene>(() => undefined));
      void service.prepare(await loadImage());
      service.clearScene();
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(service.status()).toBe('idle');
    });
  });

  describe('when the scene cannot be drawn', () => {
    it('should keep telling the user even after a photo is lifted successfully', async () => {
      service.reportRendererError(SCENE3D_ERROR_UNSUPPORTED);
      lift.and.resolveTo(SCENE);
      await service.prepare(await loadImage());

      expect(service.visibleError()).toBe(SCENE3D_ERROR_UNSUPPORTED);
      expect(service.isReady()).toBeFalse();
      expect(service.isAiming()).toBeFalse();
    });

    it('should not show the lifting overlay over the error', async () => {
      service.reportRendererError(SCENE3D_ERROR_UNSUPPORTED);
      lift.and.returnValue(new Promise<LiftedScene>(() => undefined));
      void service.prepare(await loadImage());
      expect(service.isLifting()).toBeFalse();
    });

    it('should recover once a renderer starts', async () => {
      lift.and.resolveTo(SCENE);
      await service.prepare(await loadImage());
      service.reportRendererError(SCENE3D_ERROR_UNSUPPORTED);
      service.clearRendererError();
      expect(service.visibleError()).toBeNull();
      expect(service.isReady()).toBeTrue();
    });
  });

  describe('settings', () => {
    it('should start from the defaults in one snapshot', () => {
      const settings = service.settings();
      expect(settings.style).toBe('travel');
      expect(settings.direction).toBe('left');
      expect(settings.starStyle).toBe('sharp');
      expect(settings.zoomIn).toBeTrue();
      expect(settings.starsReturn).toBeTrue();
      expect(settings.speed).toBe(SCENE3D_CONTROLS.speed.initial);
      expect(settings.twinkle).toBe(0);
    });

    it('should start with Rotation off, and take a turn either way', () => {
      expect(service.settings().rotation).toBe(0);
      service.updateControl('rotation', -6);
      expect(service.settings().rotation).toBe(-6);
      service.updateControl('rotation', 3);
      expect(service.settings().rotation).toBe(3);
    });

    it('should reflect a changed slider in the snapshot', () => {
      service.updateControl('starAmount', 250);
      expect(service.settings().starAmount).toBe(250);
    });

    it('should switch between the photo\'s own stars and sharp redrawn ones', () => {
      expect(service.hasSharpStars()).toBeTrue();

      service.setSharpStars(false);
      expect(service.hasSharpStars()).toBeFalse();
      expect(service.settings().starStyle).toBe('original');

      service.setSharpStars(true);
      expect(service.hasSharpStars()).toBeTrue();
      expect(service.settings().starStyle).toBe('sharp');
    });

    it('should keep the aim point inside the frame', () => {
      service.setAim({ x: 3, y: -3 });
      expect(service.aim()).toEqual({ x: AIM_LIMIT, y: -AIM_LIMIT });
    });

    it('should offer aiming only for a ready Custom Travel shot', async () => {
      lift.and.resolveTo(SCENE);
      service.direction.set('custom');
      expect(service.isAiming()).toBeFalse(); // not ready yet
      await service.prepare(await loadImage());
      expect(service.isAiming()).toBeTrue();
      service.style.set('arrive');
      expect(service.isAiming()).toBeFalse();
    });

    it('should restore every setting on reset but keep the prepared scene', async () => {
      lift.and.resolveTo(SCENE);
      await service.prepare(await loadImage());
      service.style.set('arrive');
      service.direction.set('right');
      service.starStyle.set('original');
      service.zoomIn.set(false);
      service.starsReturn.set(false);
      service.setAim({ x: 0.2, y: 0.1 });
      service.updateControl('speed', 9);
      service.updateControl('rotation', -4);

      service.resetToDefaults();

      const settings = service.settings();
      expect(settings.style).toBe('travel');
      expect(settings.direction).toBe('left');
      expect(settings.starStyle).toBe('sharp');
      expect(settings.zoomIn).toBeTrue();
      expect(settings.starsReturn).toBeTrue();
      expect(settings.aim).toEqual({ x: 0, y: 0 });
      expect(settings.speed).toBe(SCENE3D_CONTROLS.speed.initial);
      expect(settings.rotation).toBe(0);
      expect(service.scene()).toBe(SCENE);
    });
  });
});
