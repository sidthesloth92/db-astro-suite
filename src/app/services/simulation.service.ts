import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { RecordingState, ControlKey } from '../models/simulation.model';
import { CONTROLS, CANVAS_DIMENSIONS } from '../constants/simulation.constant';

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
  userImage = signal<string | null>(null);
  recordingDuration = signal<number>(0);
  
  // Canvas Dimensions (grouped for atomic updates)
  canvasDimensions = signal(CANVAS_DIMENSIONS);

  getControlValue(control: ControlKey): number {
    return this.controls[control]();
  }
  
  updateControl(control: ControlKey, value: number) {
    this.controls[control].set(value);
  }
}
