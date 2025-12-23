import { Injectable, signal } from '@angular/core';

export type RecordingState = 'idle' | 'recording' | 'processing';

@Injectable({
  providedIn: 'root',
})
export class SimulationService {
  // Simulation parameters as Signals
  zoomRate = signal(0.0004);
  rotationRate = signal(0.0001);
  streakingStarSpeed = signal(1);
  nonStreakingStarSpeed = signal(1);
  baseStarSize = signal(10);

  // UI / Global states
  recordingState = signal<RecordingState>('idle');
  loadingProgress = signal<string>('Initializing...');

  updateZoomRate(val: number) { this.zoomRate.set(val); }
  updateRotationRate(val: number) { this.rotationRate.set(val); }
  updateStreakingStarSpeed(val: number) { this.streakingStarSpeed.set(val); }
  updateNonStreakingStarSpeed(val: number) { this.nonStreakingStarSpeed.set(val); }
  updateBaseStarSize(val: number) { this.baseStarSize.set(val); }
}
