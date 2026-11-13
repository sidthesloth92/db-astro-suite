import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  AIM_KEY_STEP,
  MAX_FRAME_SECONDS,
  SCENE3D_ERROR_UNSUPPORTED,
  SCENE_SEED,
} from '../../constants/scene3d.constant';
import { LiftedScene } from '../../models/lifted-scene.model';
import { ParallaxRenderer } from '../../models/parallax-renderer.model';
import { FrameView, ScenePose } from '../../models/scene-pose.model';
import { StarVolume } from '../../models/star-volume.model';
import { Scene3dService } from '../../services/scene3d.service';
import { SimulationService } from '../../services/simulation.service';
import {
  arrivePose,
  frameView,
  overscanFor,
  planArrive,
  planTravel,
  reliefFor,
  starFarDepth,
  travelPose,
  travelVelocity,
} from '../../utils/camera-path.util';

/**
 * @class Scene3d
 * @description
 * The 3D preview: a WebGL canvas showing the photo's starless backdrop with its own stars
 * spread through depth, and a camera that travels through them or arrives at the object.
 *
 * Orchestration only. Settings and the lifted scene come from `Scene3dService`; the star
 * motion lives in `StarVolume`, the drawing in `ParallaxRenderer` and the camera maths in the
 * camera-path utilities. This component runs the frame loop, rebuilds the stars when a setting
 * that shapes them changes, and fulfils the same recording contract as the 2D simulator.
 */
@Component({
  selector: 'dba-sw-scene-3d',
  templateUrl: './scene-3d.html',
  styleUrl: './scene-3d.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Scene3d implements AfterViewInit {
  /** @private Canvas template reference, available after view init. */
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('sceneCanvas');

  /** 3D settings and the lifted scene. */
  protected readonly scene3d = inject(Scene3dService);

  /** Shared image, format and recording state. */
  private readonly simService = inject(SimulationService);

  /** @private Cleanup hook for the frame loop and the renderer. */
  private readonly destroyRef = inject(DestroyRef);

  /** Left position of the aim marker, in percent of the preview. */
  protected readonly aimLeft = computed(() => (this.scene3d.aim().x + 0.5) * 100);

  /** Top position of the aim marker, in percent of the preview. */
  protected readonly aimTop = computed(() => (this.scene3d.aim().y + 0.5) * 100);

  /**
   * The settings that shape the star volume. A change to any of them rebuilds the stars and
   * restarts the shot; the rest (speed, size, twinkle, cloud depth) are read live each frame.
   */
  private readonly structure = computed(() => {
    const s = this.scene3d.settings();
    const aim = s.direction === 'custom' ? `${s.aim.x},${s.aim.y}` : '';
    const depth = s.style === 'travel' ? s.starDepth : 0;
    const spikes = s.starStyle === 'sharp' ? s.spikes : 0;
    return [s.style, s.direction, aim, s.starStyle, s.starAmount, depth, spikes, s.zoomIn].join('|');
  });

  /** True once the canvas exists and the renderer has been created. */
  private readonly viewReady = signal(false);

  private renderer: ParallaxRenderer | null = null;
  private volume: StarVolume | null = null;
  private view: FrameView | null = null;
  private uploadedScene: LiftedScene | null = null;
  private frameId: number | null = null;
  private lastFrameMs: number | null = null;
  /** Progress of the current shot, 0 (start) to 1 (end). */
  private progress = 0;
  /** Seconds since the shot (re)started. */
  private seconds = 0;
  /** Seconds spent resting on the object at the end of Arrive. */
  private heldSeconds = 0;
  /** True while the user drags the preview to move the aim point. */
  private isDraggingAim = false;

  /** Effect: keep the canvas backing store at the export size. */
  private readonly _dimensionsEffect = effect(() => {
    const dims = this.simService.canvasDimensions();
    if (this.viewReady()) {
      const canvas = this.canvasRef().nativeElement;
      canvas.width = dims.width;
      canvas.height = dims.height;
    }
  });

  /** Effect: lift the stars whenever the photo changes, and drop the scene when it is cleared. */
  private readonly _prepareEffect = effect(() => {
    const image = this.simService.galaxyImage();
    const loaded = this.simService.isImageLoaded();
    untracked(() => {
      if (image !== null && loaded) {
        void this.scene3d.prepare(image);
      } else {
        this.scene3d.clearScene();
      }
    });
  });

  /** Effect: rebuild the stars when the scene, the format or a shaping setting changes. */
  private readonly _buildEffect = effect(() => {
    const scene = this.scene3d.scene();
    const dims = this.simService.canvasDimensions();
    this.structure();
    if (this.viewReady()) {
      untracked(() => this.build(scene, dims.width / dims.height));
    }
  });

  /** Effect: start or stop the recorder in response to recording state changes. */
  private readonly _recordingEffect = effect(() => {
    const state = this.simService.recordingState();
    if (!this.viewReady()) return;
    if (state === 'recording' && !this.simService.isRecording()) {
      this.simService.startRecording(this.canvasRef().nativeElement);
    } else if (state === 'idle' && this.simService.isRecording()) {
      this.simService.stopRecording();
    }
  });

  /** Effect: restart the shot from its first frame before a record-from-beginning session. */
  private readonly _resetAndRecordEffect = effect(() => {
    if (this.simService.resetAndRecordRequested()) {
      this.restart();
      this.simService.resetAndRecordRequested.set(false);
      requestAnimationFrame(() => {
        this.drawFrame(0);
        this.simService.recordingState.set('recording');
      });
    }
  });

  /** Effect: restart the shot without recording (Reset Animation, or a recorder retry). */
  private readonly _restartEffect = effect(() => {
    if (this.simService.restartAnimationRequested()) {
      this.restart();
      this.simService.restartAnimationRequested.set(false);
    }
  });

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    try {
      this.renderer = new ParallaxRenderer(canvas);
    } catch (error) {
      console.error('The 3D scene could not start:', error);
      this.scene3d.reportError(SCENE3D_ERROR_UNSUPPORTED);
      return;
    }
    this.viewReady.set(true);
    this.frameId = requestAnimationFrame(this.animate);
    this.destroyRef.onDestroy(() => {
      if (this.frameId !== null) cancelAnimationFrame(this.frameId);
      this.renderer?.dispose();
      this.renderer = null;
    });
  }

  /** Pointer down on the preview: start moving the aim point (Custom direction only). */
  protected onPointerDown(event: PointerEvent): void {
    if (!this.scene3d.isAiming()) return;
    this.isDraggingAim = true;
    this.canvasRef().nativeElement.setPointerCapture?.(event.pointerId);
    this.aimAt(event);
  }

  /** Pointer move: keep the aim point under the pointer while dragging. */
  protected onPointerMove(event: PointerEvent): void {
    if (this.isDraggingAim) this.aimAt(event);
  }

  /** Pointer up, cancel or leave: stop moving the aim point. */
  protected onPointerUp(): void {
    this.isDraggingAim = false;
  }

  /** Arrow keys on the aim marker nudge the aim point, for keyboard users. */
  protected onAimKey(event: KeyboardEvent): void {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-AIM_KEY_STEP, 0],
      ArrowRight: [AIM_KEY_STEP, 0],
      ArrowUp: [0, -AIM_KEY_STEP],
      ArrowDown: [0, AIM_KEY_STEP],
    };
    const move = step[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const aim = this.scene3d.aim();
    this.scene3d.setAim({ x: aim.x + move[0], y: aim.y + move[1] });
  }

  /** Sets the aim point from a pointer position over the preview. */
  private aimAt(event: PointerEvent): void {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.scene3d.setAim({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }

  /** Builds the lens and the star volume for the current scene and settings, then restarts. */
  private build(scene: LiftedScene | null, frameAspect: number): void {
    const renderer = this.renderer;
    if (renderer === null || scene === null) {
      // No photo: drop the stars and blank the canvas so no stale frame shows through.
      this.volume = null;
      this.uploadedScene = null;
      renderer?.clearScene();
      return;
    }
    const settings = this.scene3d.settings();
    const view = frameView(scene.width / scene.height, frameAspect, overscanFor(settings));
    const arrive = settings.style === 'arrive';
    // Arrive's stars reach exactly as deep as the camera flies, so the last one passes on arrival.
    const far = arrive ? planArrive(settings).reach : starFarDepth(settings.starDepth);
    const plan = arrive ? null : planTravel(settings, view, far);

    this.view = view;
    this.volume = new StarVolume(scene, {
      style: settings.style,
      starStyle: settings.starStyle,
      starAmount: settings.starAmount / 100,
      spikes: settings.spikes,
      view,
      far,
      start: plan?.start ?? { x: 0, y: 0, z: 0 },
      velocity: plan !== null ? travelVelocity(plan) : { x: 0, y: 0, z: -1 },
      seed: SCENE_SEED,
    });
    if (this.uploadedScene !== scene) {
      renderer.setScene(scene);
      this.uploadedScene = scene;
    }
    renderer.setStars(this.volume);
    this.restart();
  }

  /** Puts the shot back on its first frame. */
  private restart(): void {
    this.progress = 0;
    this.seconds = 0;
    this.heldSeconds = 0;
    this.volume?.reset();
  }

  private readonly animate = (now: number): void => {
    this.frameId = requestAnimationFrame(this.animate);
    // Real time, so slow devices drop frames instead of slowing the shot; capped so a tab
    // returning from the background does not leap ahead.
    const elapsed =
      this.lastFrameMs === null
        ? 0
        : Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    this.drawFrame(elapsed);
  };

  /** Advances the shot by `elapsed` seconds and draws it. */
  private drawFrame(elapsed: number): void {
    const { renderer, volume, view } = this;
    if (renderer === null || volume === null || view === null) return;
    const settings = this.scene3d.settings();
    const arrive = settings.style === 'arrive';

    let pose: ScenePose;
    if (arrive) {
      const plan = planArrive(settings);
      if (this.progress < 1) {
        this.progress = Math.min(1, this.progress + elapsed / plan.duration);
      } else {
        this.heldSeconds += elapsed;
        if (this.heldSeconds >= plan.hold) this.restart();
      }
      pose = arrivePose(plan, this.progress, this.heldSeconds, settings);
    } else {
      const far = starFarDepth(settings.starDepth);
      const plan = planTravel(settings, view, far);
      this.progress += elapsed / plan.duration;
      if (this.progress >= 1) this.restart();
      pose = travelPose(plan, this.progress);
    }
    this.seconds += elapsed;

    // Cloud depth only shows in Arrive; Travel keeps the backdrop flat.
    const relief = arrive ? reliefFor(settings.cloudDepth) : 0;
    volume.step({
      pose,
      seconds: this.seconds,
      relief,
      starSize: settings.starSize,
      twinkle: settings.twinkle,
      frameHeightPx: this.canvasRef().nativeElement.height,
    });
    renderer.render({ pose, view, relief });
  }
}
