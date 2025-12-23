import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'sfg-control-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
})
export class ControlPanel {
  constructor(public simService: SimulationService) {}

  updateZoom(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.zoomRate.set(value);
  }

  updateRotation(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.rotationRate.set(value);
  }

  updateStreakingSpeed(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.streakingStarSpeed.set(value);
  }

  updateAmbientSpeed(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.nonStreakingStarSpeed.set(value);
  }

  updateStarSize(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.baseStarSize.set(value);
  }

  toggleRecording() {
    const currentState = this.simService.recordingState();
    if (currentState === 'idle') {
      this.simService.recordingState.set('recording');
    } else if (currentState === 'recording') {
      this.simService.recordingState.set('idle'); // This will trigger stop in Simulator
    }
  }

  get buttonText(): string {
    const state = this.simService.recordingState();
    if (state === 'recording') return 'Recording... (15s max)';
    if (state === 'processing') return 'Processing...';
    return 'Start Recording (Max 15s)';
  }

  get buttonClass(): string {
    const state = this.simService.recordingState();
    if (state === 'recording') return 'bg-red-600 animate-pulse';
    if (state === 'processing') return 'bg-gray-600 cursor-not-allowed opacity-50';
    return 'bg-neon-pink/10 hover:bg-neon-pink/20';
  }
}
