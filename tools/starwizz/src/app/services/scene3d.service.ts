import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
  AIM_LIMIT,
  DEFAULT_AIM,
  DEFAULT_SCENE3D_DIRECTION,
  DEFAULT_SCENE3D_STYLE,
  DEFAULT_STAR_STYLE,
  SCENE3D_CONTROL_KEYS,
  SCENE3D_CONTROLS,
  SCENE3D_ERROR_PREPARE,
} from '../constants/scene3d.constant';
import { LIFT_WORKING_LONG_SIDE } from '../constants/star-lift.constant';
import { LiftedScene } from '../models/lifted-scene.model';
import {
  AimPoint,
  Scene3dControlKey,
  Scene3dDirection,
  Scene3dSettings,
  Scene3dStatus,
  Scene3dStyle,
  StarStyle,
} from '../models/scene3d-settings.model';
import { StarLiftSupersededError } from '../models/star-lift.error';
import { photoWorkingCopy } from '../utils/photo-working-copy.util';
import { StarLiftService } from './star-lift.service';

/**
 * @class Scene3dService
 * @description
 * State of the 3D mode: the user's settings, and the scene lifted from the current photo.
 *
 * @responsibilities
 * - Hold every 3D control as a signal, with a combined {@link settings} snapshot
 * - Prepare the scene for a photo (working copy, then star lifting) and report progress
 * - Surface failures as a status plus a message the UI can show
 */
@Injectable({ providedIn: 'root' })
export class Scene3dService {
  private readonly starLift = inject(StarLiftService);

  /** Slider controls, each initialised from `SCENE3D_CONTROLS`. */
  readonly controls: Record<Scene3dControlKey, WritableSignal<number>> = {
    speed: signal(SCENE3D_CONTROLS.speed.initial),
    cloudDepth: signal(SCENE3D_CONTROLS.cloudDepth.initial),
    starAmount: signal(SCENE3D_CONTROLS.starAmount.initial),
    starSize: signal(SCENE3D_CONTROLS.starSize.initial),
    starDepth: signal(SCENE3D_CONTROLS.starDepth.initial),
    spikes: signal(SCENE3D_CONTROLS.spikes.initial),
    twinkle: signal(SCENE3D_CONTROLS.twinkle.initial),
  };

  /** Travel or Arrive. */
  readonly style = signal<Scene3dStyle>(DEFAULT_SCENE3D_STYLE);
  /** Travel direction preset. */
  readonly direction = signal<Scene3dDirection>(DEFAULT_SCENE3D_DIRECTION);
  /** Point the camera flies toward when the direction is Custom. */
  readonly aim = signal<AimPoint>(DEFAULT_AIM);
  /** Original or Sharp stars. */
  readonly starStyle = signal<StarStyle>(DEFAULT_STAR_STYLE);
  /** Arrive: whether the camera really approaches the object. */
  readonly zoomIn = signal<boolean>(true);
  /** Arrive: whether the photo's stars fade back in once the camera has settled. */
  readonly starsReturn = signal<boolean>(true);

  /** Every setting in one snapshot, for the scene to read each frame. */
  readonly settings = computed<Scene3dSettings>(() => ({
    style: this.style(),
    direction: this.direction(),
    aim: this.aim(),
    starStyle: this.starStyle(),
    zoomIn: this.zoomIn(),
    starsReturn: this.starsReturn(),
    speed: this.controls.speed(),
    cloudDepth: this.controls.cloudDepth(),
    starAmount: this.controls.starAmount(),
    starSize: this.controls.starSize(),
    starDepth: this.controls.starDepth(),
    spikes: this.controls.spikes(),
    twinkle: this.controls.twinkle(),
  }));

  /** Where the lifted scene stands: idle, lifting, ready or error. */
  readonly status = signal<Scene3dStatus>('idle');
  /** Message to show the user when {@link status} is `error`. */
  readonly errorMessage = signal<string | null>(null);
  /** The scene lifted from the current photo, or null until it is ready. */
  readonly scene = signal<LiftedScene | null>(null);
  /**
   * Set when the scene cannot be drawn at all (no WebGL2, or the graphics context could not be
   * rebuilt). Kept apart from {@link status} so that lifting a photo can never clear it.
   */
  readonly rendererError = signal<string | null>(null);
  /** The message the preview should show, if anything is wrong; the renderer's comes first. */
  readonly visibleError = computed(
    () => this.rendererError() ?? (this.status() === 'error' ? this.errorMessage() : null),
  );
  /** True while the stars are being lifted and the scene will be drawable once they are. */
  readonly isLifting = computed(() => this.status() === 'lifting' && this.rendererError() === null);
  /** True when the scene can be played and recorded. */
  readonly isReady = computed(() => this.status() === 'ready' && this.rendererError() === null);
  /** True when the user is choosing where a Custom Travel shot heads. */
  readonly isAiming = computed(
    () => this.isReady() && this.style() === 'travel' && this.direction() === 'custom',
  );

  /** The photo the current (or in-flight) scene belongs to. */
  private preparedImage: HTMLImageElement | null = null;

  /**
   * Prepares the 3D scene for a photo. Does nothing if that photo is already prepared or being
   * prepared. A newer call replaces an older one that is still running.
   *
   * @param image - The fully loaded photo
   */
  async prepare(image: HTMLImageElement): Promise<void> {
    if (image === this.preparedImage && this.status() !== 'error') {
      return;
    }
    this.preparedImage = image;
    this.scene.set(null);
    this.errorMessage.set(null);
    this.status.set('lifting');

    try {
      const copy = photoWorkingCopy(image, LIFT_WORKING_LONG_SIDE);
      if (copy === null) {
        this.reportError(SCENE3D_ERROR_PREPARE);
        return;
      }
      const scene = await this.starLift.lift(copy);
      if (this.preparedImage !== image) {
        return; // a newer photo took over while this one was being lifted
      }
      this.scene.set(scene);
      this.status.set('ready');
    } catch (error) {
      if (error instanceof StarLiftSupersededError) {
        return; // expected: a newer photo replaced this run
      }
      console.error('Failed to prepare the 3D scene:', error);
      if (this.preparedImage === image) {
        this.reportError(SCENE3D_ERROR_PREPARE);
      }
    }
  }

  /** Drops the scene and abandons any lift in flight, for when the photo is cleared. */
  clearScene(): void {
    this.starLift.cancel();
    this.preparedImage = null;
    this.scene.set(null);
    this.errorMessage.set(null);
    this.status.set('idle');
  }

  /** Records that the scene cannot be drawn, with a message for the user. */
  reportRendererError(message: string): void {
    this.rendererError.set(message);
  }

  /** Clears a renderer failure, once a renderer has started successfully. */
  clearRendererError(): void {
    this.rendererError.set(null);
  }

  /** Puts the lifted scene into the error state with a message for the user. */
  private reportError(message: string): void {
    this.scene.set(null);
    this.errorMessage.set(message);
    this.status.set('error');
  }

  /** Sets a slider control. */
  updateControl(control: Scene3dControlKey, value: number): void {
    this.controls[control].set(value);
  }

  /** Moves the Custom aim point, keeping it inside the frame. */
  setAim(point: AimPoint): void {
    this.aim.set({
      x: Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, point.x)),
      y: Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, point.y)),
    });
  }

  /** Restores every 3D setting to its default. The prepared scene is kept. */
  resetToDefaults(): void {
    for (const key of SCENE3D_CONTROL_KEYS) {
      this.controls[key].set(SCENE3D_CONTROLS[key].initial);
    }
    this.style.set(DEFAULT_SCENE3D_STYLE);
    this.direction.set(DEFAULT_SCENE3D_DIRECTION);
    this.aim.set(DEFAULT_AIM);
    this.starStyle.set(DEFAULT_STAR_STYLE);
    this.zoomIn.set(true);
    this.starsReturn.set(true);
  }
}
