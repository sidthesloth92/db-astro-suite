import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulationService } from '../../services/simulation.service';
import { CONTROLS } from '../../constants/simulation.constant';
import { ControlMetadata, ControlKey } from '../../models/simulation.model';

@Component({
  selector: 'sfg-control-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
})
export class ControlPanel {
  public controlConfig = CONTROLS;
  public controlNames = Object.keys(CONTROLS) as ControlKey[];

  constructor(public simService: SimulationService) {}

  updateControl(control: ControlKey, event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.updateControl(control, value);
  }

  getControlValue(control: ControlKey): number {
    return this.simService.getControlValue(control);
  }

  toggleRecording() {
    const currentState = this.simService.recordingState();
    if (currentState === 'idle') {
      this.simService.recordingState.set('recording');
    } else if (currentState === 'recording') {
      this.simService.recordingState.set('idle');
    }
  }

  get buttonText(): string {
    const state = this.simService.recordingState();
    if (state === 'recording') return 'Recording... (30s max)';
    if (state === 'processing') return 'Processing...';
    return 'Start Recording (Max 30s)';
  }

  get buttonClass(): string {
    const state = this.simService.recordingState();
    const isImageLoaded = this.simService.isImageLoaded();
    
    if (!isImageLoaded) return 'record-button grayscale opacity-40 cursor-not-allowed';
    if (state === 'recording') return 'record-button bg-red-600 animate-pulse';
    if (state === 'processing') return 'record-button bg-gray-600 cursor-not-allowed opacity-50';
    return 'record-button bg-neon-pink/10 hover:bg-neon-pink/20';
  }
}
