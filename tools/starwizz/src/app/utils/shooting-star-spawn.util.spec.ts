import {
  frameCircleRadius,
  isOutsideFrameCircle,
  isOutsideFrameRect,
  lateralEntryPoint,
} from './shooting-star-spawn.util';

const HALF_WIDTH = 540;
const HALF_HEIGHT = 960;
const MARGIN = 20;

/** Unit drift vector on screen for an angle in degrees (0 = right, 90 = up). */
function driftVector(degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians), y: -Math.sin(radians) };
}

describe('lateralEntryPoint', () => {
  it('should enter from beyond the left edge when drifting right', () => {
    const entry = lateralEntryPoint(driftVector(0), HALF_WIDTH, HALF_HEIGHT, MARGIN, 0.5);

    expect(entry.x).toBeCloseTo(-(HALF_WIDTH + MARGIN), 6);
    expect(entry.y).toBeCloseTo(0.5 * HALF_HEIGHT, 6);
  });

  it('should enter from beyond the right edge when drifting left', () => {
    const entry = lateralEntryPoint(driftVector(180), HALF_WIDTH, HALF_HEIGHT, MARGIN, 0);

    expect(entry.x).toBeCloseTo(HALF_WIDTH + MARGIN, 6);
    expect(entry.y).toBeCloseTo(0, 6);
  });

  it('should enter from beyond the bottom edge when drifting up', () => {
    const entry = lateralEntryPoint(driftVector(90), HALF_WIDTH, HALF_HEIGHT, MARGIN, 0);

    expect(entry.y).toBeCloseTo(HALF_HEIGHT + MARGIN, 6);
    expect(Math.abs(entry.x)).toBeLessThanOrEqual(HALF_WIDTH);
  });

  it('should enter from beyond the top edge when drifting down', () => {
    const entry = lateralEntryPoint(driftVector(270), HALF_WIDTH, HALF_HEIGHT, MARGIN, 0);

    expect(entry.y).toBeCloseTo(-(HALF_HEIGHT + MARGIN), 6);
    expect(Math.abs(entry.x)).toBeLessThanOrEqual(HALF_WIDTH);
  });

  it('should spread entry points across the whole edge', () => {
    const top = lateralEntryPoint(driftVector(0), HALF_WIDTH, HALF_HEIGHT, MARGIN, -1);
    const bottom = lateralEntryPoint(driftVector(0), HALF_WIDTH, HALF_HEIGHT, MARGIN, 1);

    expect(top.y).toBeCloseTo(-HALF_HEIGHT, 6);
    expect(bottom.y).toBeCloseTo(HALF_HEIGHT, 6);
  });

  it('should start every diagonal streak off-screen on a line that crosses the visible frame', () => {
    for (const degrees of [30, 45, 135, 200, 315]) {
      for (const offsetFraction of [-0.9, -0.4, 0, 0.4, 0.9]) {
        const direction = driftVector(degrees);
        const entry = lateralEntryPoint(direction, HALF_WIDTH, HALF_HEIGHT, MARGIN, offsetFraction);

        // Born out of view, at least the margin beyond the visible frame.
        expect(isOutsideFrameRect(entry, HALF_WIDTH, HALF_HEIGHT, MARGIN - 0.001))
          .withContext(`${degrees}° / ${offsetFraction} starts off-screen`)
          .toBe(true);

        // Following the drift from there brings it inside the visible frame.
        let entersFrame = false;
        for (let distance = 0; distance < 4 * HALF_HEIGHT; distance += 5) {
          const point = {
            x: entry.x + direction.x * distance,
            y: entry.y + direction.y * distance,
          };
          if (!isOutsideFrameRect(point, HALF_WIDTH, HALF_HEIGHT, 0)) {
            entersFrame = true;
            break;
          }
        }
        expect(entersFrame).withContext(`${degrees}° / ${offsetFraction} enters the frame`).toBe(true);
      }
    }
  });
});

describe('isOutsideFrameRect', () => {
  it('should treat the frame and its margin as inside', () => {
    expect(isOutsideFrameRect({ x: 0, y: 0 }, HALF_WIDTH, HALF_HEIGHT, MARGIN)).toBe(false);
    expect(isOutsideFrameRect({ x: HALF_WIDTH + MARGIN, y: 0 }, HALF_WIDTH, HALF_HEIGHT, MARGIN)).toBe(
      false,
    );
  });

  it('should report points beyond the margin on either axis as outside', () => {
    expect(
      isOutsideFrameRect({ x: HALF_WIDTH + MARGIN + 1, y: 0 }, HALF_WIDTH, HALF_HEIGHT, MARGIN),
    ).toBe(true);
    expect(
      isOutsideFrameRect({ x: 0, y: -(HALF_HEIGHT + MARGIN + 1) }, HALF_WIDTH, HALF_HEIGHT, MARGIN),
    ).toBe(true);
  });
});

describe('isOutsideFrameCircle', () => {
  it('should keep every corner of the frame inside the circle', () => {
    expect(frameCircleRadius(HALF_WIDTH, HALF_HEIGHT)).toBeCloseTo(
      Math.hypot(HALF_WIDTH, HALF_HEIGHT),
      6,
    );
    expect(isOutsideFrameCircle({ x: HALF_WIDTH, y: HALF_HEIGHT }, HALF_WIDTH, HALF_HEIGHT, 0)).toBe(
      false,
    );
  });

  it('should report a point beyond the circle and margin as outside in any direction', () => {
    const radius = frameCircleRadius(HALF_WIDTH, HALF_HEIGHT) + MARGIN + 1;

    for (const degrees of [0, 60, 150, 270]) {
      const radians = (degrees * Math.PI) / 180;
      const point = { x: Math.cos(radians) * radius, y: Math.sin(radians) * radius };
      expect(isOutsideFrameCircle(point, HALF_WIDTH, HALF_HEIGHT, MARGIN)).toBe(true);
    }
  });
});
