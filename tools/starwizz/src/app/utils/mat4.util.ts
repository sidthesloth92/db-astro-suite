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

/** View matrix of a camera at (x, y, z) that looks straight down -z with no rotation. */
export function viewFromPosition(x: number, y: number, z: number): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  m[12] = -x;
  m[13] = -y;
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
