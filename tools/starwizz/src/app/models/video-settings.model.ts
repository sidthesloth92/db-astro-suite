import { TravelDirection } from './simulation.model';

/** The 2D settings that shape a clip, as the panel holds them when the recording is saved. */
export interface Video2dSettings {
  /** Travel direction, including `path` for a Custom Path. */
  direction: TravelDirection;
  /** Rotation slider value: 0 = off, negative anticlockwise, positive clockwise. */
  rotation: number;
  /** The master Stars switch. */
  hasStars: boolean;
  /** The Shooting Stars switch. */
  hasShootingStars: boolean;
}
