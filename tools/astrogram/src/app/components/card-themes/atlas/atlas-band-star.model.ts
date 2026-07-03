import type { ThemeIntegrationBand } from '../../../models/card-theme.model';

/** A band marker plotted on the Atlas star chart at a node position. */
export interface AtlasBandStar {
  /** Node x coordinate in chart space. */
  readonly x: number;
  /** Node y coordinate in chart space. */
  readonly y: number;
  /** Integration band the marker represents. */
  readonly band: ThemeIntegrationBand;
}
