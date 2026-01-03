import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { RecordingState, ControlKey } from '../models/simulation.model';
import { CONTROLS, ASPECT_RATIOS, AspectRatioKey, DEFAULT_GALAXY_URL } from '../constants/simulation.constant';
import { AmbientStar } from '../models/ambient-star.model';
import { ShootingStar } from '../models/shooting-star.model';

const FRAME_RATE = 60;
const MAX_RECORDING_SECONDS = 30;
const NUM_AMBIENT_STARS = 1000;
const NUM_SHOOTING_STARS = 10;

@Injectable({
  providedIn: 'root',
})
export class SimulationService {
  // Config-driven Signals grouped in an object for type-safe access
  public readonly controls: Record<ControlKey, WritableSignal<number>> = {
    zoomRate: signal(CONTROLS['zoomRate'].initial),
    rotationRate: signal(CONTROLS['rotationRate'].initial),
    shootingStarSpeed: signal(CONTROLS['shootingStarSpeed'].initial),
    ambientStarSpeed: signal(CONTROLS['ambientStarSpeed'].initial),
    baseStarSize: signal(CONTROLS['baseStarSize'].initial),
  };

  // UI / Global states
  recordingState = signal<RecordingState>('idle');
  loadingProgress = signal<string>('Initializing...');

  // Image State
  isImageLoaded = signal<boolean>(false);
  isDefaultImage = signal<boolean>(false);
  userImage = signal<string | null>(null);
  recordingDuration = signal<number>(0);
  galaxyImage = signal<HTMLImageElement | null>(null);

  // Ratio State
  currentAspectRatio = signal<AspectRatioKey>('9:16');

  // Canvas Dimensions (calculated based on ratio)
  canvasDimensions = computed(() => {
    const ratio = this.currentAspectRatio();
    return ASPECT_RATIOS[ratio];
  });

  // Star Collections
  ambientStars = signal<AmbientStar[]>([]);
  shootingStars = signal<ShootingStar[]>([]);

  // Recording State (private)
  private mediaRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  private recordingTimeout: ReturnType<typeof setTimeout> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private currentGenerationId = 0;

  getControlValue(control: ControlKey): number {
    return this.controls[control]();
  }

  updateControl(control: ControlKey, value: number) {
    this.controls[control].set(value);
  }

  // ==================== Image Management ====================

  loadDefaultScene(): void {
    this.loadingProgress.set('Loading Default Scene...');

    const image = new Image();
    image.onload = () => {
      this.galaxyImage.set(image);
      this.isDefaultImage.set(true);
      this.isImageLoaded.set(true);
      this.loadingProgress.set('Ready');
    };
    image.onerror = () => {
      console.error('Failed to load default galaxy image.');
      this.loadingProgress.set('Ready');
    };
    image.src = DEFAULT_GALAXY_URL;
  }

  handleImageUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.loadingProgress.set('Loading Image...');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.userImage.set(result);

      const image = new Image();
      image.onload = () => {
        this.galaxyImage.set(image);
        this.isDefaultImage.set(false);
        this.isImageLoaded.set(true);
        this.loadingProgress.set('Ready');
      };
      image.onerror = () => {
        console.error('Failed to load user image.');
        this.loadingProgress.set('Error loading image');
      };
      image.src = result;
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.isDefaultImage.set(false);
    this.isImageLoaded.set(false);
    this.userImage.set(null);
    this.galaxyImage.set(null);
  }

  // ==================== Star Generation ====================

  loadStarsAsync(width: number, height: number, callback: () => void): void {
    let starsGenerated = 0;
    const BATCH_SIZE = 50;
    const generationId = Date.now();
    this.currentGenerationId = generationId;

    const currentStars: AmbientStar[] = [];

    const generateBatch = () => {
      if (this.currentGenerationId !== generationId) return;

      const targetCount = Math.min(NUM_AMBIENT_STARS, starsGenerated + BATCH_SIZE);
      while (starsGenerated < targetCount) {
        currentStars.push(new AmbientStar(width, height, this));
        starsGenerated++;
      }

      const percentage = Math.floor((starsGenerated / NUM_AMBIENT_STARS) * 100);
      this.loadingProgress.set(`Generating Stars: ${percentage}%`);

      if (starsGenerated < NUM_AMBIENT_STARS) {
        requestAnimationFrame(generateBatch);
      } else {
        this.ambientStars.set(currentStars);
        this.initShootingStars(width, height);
        callback();
      }
    };
    generateBatch();
  }

  initShootingStars(width: number, height: number): void {
    const stars: ShootingStar[] = [];
    for (let i = 0; i < NUM_SHOOTING_STARS; i++) {
      stars.push(new ShootingStar(width, height, this));
    }
    this.shootingStars.set(stars);
  }

  resetStars(): void {
    this.ambientStars.set([]);
    this.shootingStars.set([]);
  }

  // ==================== Video Recording ====================

  startRecording(canvas: HTMLCanvasElement): void {
    this.videoChunks = [];

    try {
      const stream = (canvas as any).captureStream(FRAME_RATE);
      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.setupRecorderListeners(mimeType);

      this.mediaRecorder.start();

      this.recordingDuration.set(0);
      this.timerInterval = setInterval(() => {
        this.recordingDuration.update((d) => d + 1);
      }, 1000);

      this.recordingTimeout = setTimeout(() => this.stopRecording(), MAX_RECORDING_SECONDS * 1000);
    } catch (e) {
      console.error('Error starting recording:', e);
      this.recordingState.set('idle');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }

  private getSupportedMimeType(): string {
    const types = ['video/mp4; codecs="avc1.42E01E, mp4a.40.2"', 'video/mp4', 'video/webm'];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';
  }

  private setupRecorderListeners(mimeType: string): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.videoChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.handleRecordingStop(mimeType);
    };
  }

  private handleRecordingStop(mimeType: string): void {
    const blob = new Blob(this.videoChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const extension = mimeType.includes('mp4') ? '.mp4' : '.webm';

    const a = document.createElement('a');
    a.href = url;
    a.download = `starfield-simulation${extension}`;
    a.click();

    URL.revokeObjectURL(url);
    this.recordingState.set('idle');
    this.mediaRecorder = null;
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
