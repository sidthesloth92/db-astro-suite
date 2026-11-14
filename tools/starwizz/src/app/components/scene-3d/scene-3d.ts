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
  AIM_KEY_STEP_LARGE,
  AIM_LIMIT,
  MAX_FRAME_SECONDS,
  SCENE3D_ERROR_UNSUPPORTED,
  SCENE_SEED,
} from '../../constants/scene3d.constant';
import { LiftedScene } from '../../models/lifted-scene.model';
import { ParallaxRenderer } from '../../models/parallax-renderer.model';
import { FrameView, ScenePose } from '../../models/scene-pose.model';
import { AimPoint } from '../../models/scene3d-settings.model';
import { StarVolume } from '../../models/star-volume.model';
import { Scene3dService } from '../../services/scene3d.service';
import { SimulationService } from '../../services/simulation.service';
import {
  arrivePose,
  frameShot,
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

  /**
   * Where the aim marker is while the user drags it. The stars are only rebuilt when the drag
   * ends, so the marker follows the pointer without restarting the shot on every move.
   */
  private readonly draftAim = signal<AimPoint | null>(null);

  /** The aim point to show: the one being dragged, or the committed one. */
  private readonly shownAim = computed(() => this.draftAim() ?? this.scene3d.aim());

  /** Left position of the aim marker, in percent of the preview. */
  protected readonly aimLeft = computed(() => (this.shownAim().x + 0.5) * 100);

  /** Top position of the aim marker, in percent of the preview. */
  protected readonly aimTop = computed(() => (this.shownAim().y + 0.5) * 100);

  /** Spoken description of the aim marker, including where it currently sits. */
  protected readonly aimLabel = computed(() => {
    const { x, y } = this.shownAim();
    const across = Math.round(Math.abs(x) * 100);
    const down = Math.round(Math.abs(y) * 100);
    const horizontal = across === 0 ? 'centred left to right' : `${across} percent ${x > 0 ? 'right' : 'left'} of centre`;
    const vertical = down === 0 ? 'centred top to bottom' : `${down} percent ${y > 0 ? 'below' : 'above'} centre`;
    return `Point the camera flies toward: ${horizontal}, ${vertical}. Drag the preview or use the arrow keys to move it. Hold Shift for bigger steps.`;
  });

  /**
   * The settings that shape the star volume. A change to any of them rebuilds the stars and
   * restarts the shot; the rest (speed, size, twinkle, cloud depth) are read live each frame.
   * Rotation is one of them: how far the frame turns decides how much the photo is zoomed in
   * and how wide the stars are spread. While the view turns, so is Speed, because it sets how
   * long the shot lasts and so how far the frame turns.
   */
  private readonly structure = computed(() => {
    const s = this.scene3d.settings();
    const travel = s.style === 'travel';
    const sharp = s.starStyle === 'sharp';
    // Only settings that matter to the current style take part, so toggling one that has no
    // effect right now does not restart the shot.
    return [
      s.style,
      travel ? s.direction : '',
      travel && s.direction === 'custom' ? `${s.aim.x},${s.aim.y}` : '',
      s.starStyle,
      s.starAmount,
      travel ? s.starDepth : 0,
      sharp ? s.spikes : 0,
      travel ? '' : s.zoomIn,
      !travel && sharp ? s.starsReturn : '',
      s.rotation,
      s.rotation !== 0 ? s.speed : '',
    ].join('|');
  });

  /** True once the canvas exists and the renderer has been created. */
  private readonly viewReady = signal(false);

  private renderer: ParallaxRenderer | null = null;
  private volume: StarVolume | null = null;
  private view: FrameView | null = null;
  /** The box the turning frame stays inside; the lens itself when the view does not turn. */
  private cover: FrameView | null = null;
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
    // Without a working renderer there is nothing to show the scene on, so nothing is lifted.
    if (!this.viewReady()) return;
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

  /** Creates the renderer and starts the frame loop, or reports that 3D cannot be drawn here. */
  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    try {
      this.renderer = new ParallaxRenderer(canvas, (error) => {
        console.error('The 3D scene could not be restored:', error);
        this.scene3d.reportRendererError(SCENE3D_ERROR_UNSUPPORTED);
      });
    } catch (error) {
      console.error('The 3D scene could not start:', error);
      this.scene3d.reportRendererError(SCENE3D_ERROR_UNSUPPORTED);
      return;
    }
    this.scene3d.clearRendererError();
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

  /** Pointer move: keep the aim marker under the pointer while dragging. */
  protected onPointerMove(event: PointerEvent): void {
    if (this.isDraggingAim) this.aimAt(event);
  }

  /**
   * Pointer up or cancel, or the pointer capture was lost: the drag is over, so the new aim
   * point is applied and the shot restarts toward it.
   */
  protected onPointerUp(): void {
    this.isDraggingAim = false;
    const aim = this.draftAim();
    if (aim !== null) {
      this.draftAim.set(null);
      this.scene3d.setAim(aim);
    }
  }

  /** Arrow keys on the aim marker nudge the aim point, for keyboard users; Shift moves further. */
  protected onAimKey(event: KeyboardEvent): void {
    const amount = event.shiftKey ? AIM_KEY_STEP_LARGE : AIM_KEY_STEP;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-amount, 0],
      ArrowRight: [amount, 0],
      ArrowUp: [0, -amount],
      ArrowDown: [0, amount],
    };
    const move = step[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const aim = this.scene3d.aim();
    this.scene3d.setAim({ x: aim.x + move[0], y: aim.y + move[1] });
  }

  /** Moves the aim marker to a pointer position over the preview, kept inside the frame. */
  private aimAt(event: PointerEvent): void {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const clamp = (value: number): number => Math.min(AIM_LIMIT, Math.max(-AIM_LIMIT, value));
    this.draftAim.set({
      x: clamp((event.clientX - rect.left) / rect.width - 0.5),
      y: clamp((event.clientY - rect.top) / rect.height - 0.5),
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
    const arrive = settings.style === 'arrive';
    // Arrive's stars reach exactly as deep as the camera flies, so the last one passes on arrival.
    const far = arrive ? planArrive(settings).reach : starFarDepth(settings.starDepth);
    const { view, cover } = frameShot(settings, scene.width / scene.height, frameAspect, far);
    const plan = arrive ? null : planTravel(settings, view, far, cover);

    this.view = view;
    this.cover = cover;
    this.volume = new StarVolume(scene, {
      style: settings.style,
      starStyle: settings.starStyle,
      starAmount: settings.starAmount / 100,
      spikes: settings.spikes,
      view,
      cover,
      far,
      start: plan?.start ?? { x: 0, y: 0, z: 0 },
      velocity: plan !== null ? travelVelocity(plan) : { x: 0, y: 0, z: -1 },
      returnStars: arrive && settings.starsReturn,
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
    const { renderer, volume, view, cover } = this;
    if (renderer === null || volume === null || view === null || cover === null) return;
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
      const plan = planTravel(settings, view, far, cover);
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
    // When the volume draws the returning stars itself (Sharp style), the backdrop stays
    // starless instead of cross-fading to the photo's soft stars.
    const backdropPose = volume.drawsReturningStars ? { ...pose, photoMix: 0 } : pose;
    renderer.render({ pose: backdropPose, view, relief });
  }
}
