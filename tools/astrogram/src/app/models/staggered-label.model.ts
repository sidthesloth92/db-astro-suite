/** Where a label placed by `staggerLabels` sits along its axis, and in which row. */
export interface StaggeredLabel {
  /** Centre position along the axis. */
  readonly x: number;
  /** True when the label moved to the second, alternate row. */
  readonly isSecondRow: boolean;
}
