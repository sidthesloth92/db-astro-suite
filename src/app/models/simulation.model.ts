export type RecordingState = 'idle' | 'recording' | 'processing';

export type ControlKey = 
  | 'zoomRate'
  | 'rotationRate'
  | 'shootingStarSpeed'
  | 'starSpeed'
  | 'baseStarSize';

export interface ControlMetadata {
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  precision: number;
  /** Optional multiplier to convert UI value to internal value (default: 1) */
  internalMultiplier?: number;
}
