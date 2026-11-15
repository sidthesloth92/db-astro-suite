/**
 * Perspective projection from the tangents of the half field of view, as a column-major 4x4
 * matrix ready for WebGL. The camera looks down -z.
 */
export function perspectiveFromTangents(
  tanX: number,
  tanY: number,
  near: number,
  far: number,
): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1 / tanX;
  m[5] = 1 / tanY;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

/**
 * View matrix of a camera at (x, y, z) that looks straight down -z.
 *
 * @param roll - How far the picture is turned on screen, in radians; positive is clockwise.
 *   The camera itself rolls the other way.
 */
export function viewFromPosition(x: number, y: number, z: number, roll = 0): Float32Array {
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const m = new Float32Array(16);
  m[0] = cos;
  m[1] = -sin;
  m[4] = sin;
  m[5] = cos;
  m[10] = 1;
  m[15] = 1;
  m[12] = -(cos * x + sin * y);
  m[13] = sin * x - cos * y;
  m[14] = -z;
  return m;
}

/** Product a x b of two column-major 4x4 matrices. */
export function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[column * 4 + k];
      }
      out[column * 4 + row] = sum;
    }
  }
  return out;
}
