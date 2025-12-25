import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { RecordingState, ControlKey } from '../models/simulation.model';
import { CONTROLS } from '../constants/simulation.constant';

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

  getControl(control: ControlKey): number {
    return this.controls[control]();
  }

  getParameterSignal(control: ControlKey): Signal<number> {
    return this.controls[control];
  }

  updateParameter(control: ControlKey, value: number) {
    this.controls[control].set(value);
  }
}
