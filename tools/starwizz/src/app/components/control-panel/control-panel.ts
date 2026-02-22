import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SliderComponent, SelectComponent, CheckboxComponent, SelectOption } from '@db-astro-suite/ui';
import { SimulationService } from '../../services/simulation.service';
import { CONTROLS, ASPECT_RATIOS, AspectRatioKey } from '../../constants/simulation.constant';
import { ControlMetadata, ControlKey } from '../../models/simulation.model';

@Component({
  selector: 'dba-sw-control-panel',
  standalone: true,
  imports: [CommonModule, SliderComponent, SelectComponent, CheckboxComponent],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ControlPanel {
  public controlConfig = CONTROLS;
  public controlNames = Object.keys(CONTROLS) as ControlKey[];
  public aspectRatios = ASPECT_RATIOS;
  public ratioKeys = Object.keys(ASPECT_RATIOS) as AspectRatioKey[];
  public ratioOptions: SelectOption[] = this.ratioKeys.map(key => ({
    label: ASPECT_RATIOS[key].label,
    value: key
  }));

  constructor(public simService: SimulationService) {}

  updateAspectRatio(value: string | number | boolean) {
    this.simService.currentAspectRatio.set(value as AspectRatioKey);
  }

  updateControl(control: ControlKey, event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.simService.updateControl(control, value);
  }

  updateControlValue(control: ControlKey, value: number) {
    this.simService.updateControl(control, value);
  }

  getControlValue(control: ControlKey): number {
    return this.simService.getControlValue(control);
  }

  toggleRecording() {
    const currentState = this.simService.recordingState();
    if (currentState === 'idle') {
      if (this.simService.recordFromBeginning()) {
        // Request animation reset before recording starts
        this.simService.resetAndRecordRequested.set(true);
      } else {
        // Start recording from current position
        this.simService.recordingState.set('recording');
      }
    } else if (currentState === 'recording') {
      this.simService.recordingState.set('idle');
    }
  }

  toggleFromBeginning(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.simService.recordFromBeginning.set(checked);
  }

  restartAnimation() {
    this.simService.restartAnimationRequested.set(true);
  }

  resetParams() {
    this.simService.resetControlsToDefaults();
  }

  get buttonText(): string {
    const state = this.simService.recordingState();
    const duration = this.simService.recordingDuration();
    if (state === 'recording') return `Recording... (${duration}s)`;
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
