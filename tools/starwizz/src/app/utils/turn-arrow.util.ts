/**
 * The arrow shown beside a rotation value: which way the picture turns.
 *
 * @param value - The rotation setting; positive turns clockwise
 * @returns A clockwise or an anticlockwise arrow
 */
export function turnArrow(value: number): string {
  return value > 0 ? '\u21BB' : '\u21BA';
}
