import { Injectable, signal, Signal, WritableSignal, computed } from '@angular/core';
import { RecordingState, ControlKey } from '../models/simulation.model';
import { CONTROLS, ASPECT_RATIOS, AspectRatioKey } from '../constants/simulation.constant';

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

  // Ratio State
  currentAspectRatio = signal<AspectRatioKey>('9:16');
  
  // Canvas Dimensions (calculated based on ratio)
  canvasDimensions = computed(() => {
    const ratio = this.currentAspectRatio();
    return ASPECT_RATIOS[ratio];
  });

  getControlValue(control: ControlKey): number {
    return this.controls[control]();
  }
  
  updateControl(control: ControlKey, value: number) {
    this.controls[control].set(value);
  }
}
