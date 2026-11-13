import { multiplyMat4, perspectiveFromTangents, viewFromPosition } from './mat4.util';

/** Applies a column-major 4x4 matrix to a point and performs the perspective divide. */
function project(m: Float32Array, x: number, y: number, z: number): [number, number, number] {
  const out = [0, 1, 2, 3].map((row) => m[row] * x + m[4 + row] * y + m[8 + row] * z + m[12 + row]);
  return [out[0] / out[3], out[1] / out[3], out[2] / out[3]];
}

describe('mat4 util', () => {
  it('should project a point on the edge of the field of view onto the edge of the frame', () => {
    const p = perspectiveFromTangents(0.5, 0.25, 0.01, 10);
    const [x, y] = project(p, 0.5 * 2, 0.25 * 2, -2);
    expect(x).toBeCloseTo(1, 6);
    expect(y).toBeCloseTo(1, 6);
  });

  it('should map the near and far distances to the ends of the depth range', () => {
    const p = perspectiveFromTangents(0.5, 0.5, 0.1, 10);
    expect(project(p, 0, 0, -0.1)[2]).toBeCloseTo(-1, 5);
    expect(project(p, 0, 0, -10)[2]).toBeCloseTo(1, 5);
  });

  it('should move the world opposite to the camera', () => {
    const v = viewFromPosition(2, -1, 3);
    const [x, y, z] = project(v, 2, -1, 0);
    expect([x, y, z]).toEqual([0, 0, -3]);
  });

  it('should combine view then projection in one matrix', () => {
    const p = perspectiveFromTangents(0.5, 0.5, 0.01, 10);
    const v = viewFromPosition(0.2, 0, 0);
    const combined = multiplyMat4(p, v);
    const viaSteps = project(p, ...project(v, 0.7, 0.1, -1));
    const direct = project(combined, 0.7, 0.1, -1);
    expect(direct[0]).toBeCloseTo(viaSteps[0], 6);
    expect(direct[1]).toBeCloseTo(viaSteps[1], 6);
  });
});
