/**
 * GLSL chunks shared by the planetarium passes.
 *
 * Conventions: framebuffer pixels with y up (gl_FragCoord); the stereographic
 * projection uses `u_center` (px) and `u_scale` (px per plane unit); camera
 * space is x right, y up, z forward; ENU is x east, y north, z up.
 */

/** Full-screen triangle vertex shader (no attributes). */
export const FULLSCREEN_VERT = `#version 300 es
void main() {
  // Covers the viewport with one triangle: (-1,-1), (3,-1), (-1,3).
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

/** Stereographic unproject + hashing/noise helpers used by several fragment shaders. */
export const GLSL_COMMON = `
uniform vec2 u_res;
uniform vec2 u_center;
uniform float u_scale;

const float PI = 3.14159265358979;
const float TWO_PI = 6.28318530717959;

/* Framebuffer pixel (y up) -> camera-space unit direction (inverse stereographic). */
vec3 unprojectDir(vec2 px) {
  vec2 P = (px - u_center) / u_scale;
  float r2 = dot(P, P);
  float cz = (4.0 - r2) / (4.0 + r2);
  float h = (1.0 + cz) * 0.5;
  return vec3(P * h, cz);
}

/* Camera-space direction -> framebuffer pixel. */
vec2 projectDir(vec3 c) {
  float k = 2.0 / (1.0 + c.z);
  return u_center + c.xy * k * u_scale;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

/* 1D value noise, smooth. */
float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash11(i), hash11(i + 1.0), u);
}

/* Interleaved gradient noise for dithering. */
float ign(vec2 px) {
  return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y));
}

/* Kasten-Young relative airmass from altitude (radians); clamped near the horizon. */
float airmass(float altRad) {
  float a = max(altRad, -0.03);
  float deg = a * 57.2957795;
  return 1.0 / (sin(a) + 0.50572 * pow(max(deg + 6.07995, 0.1), -1.6364));
}

/* Atmospheric extinction factor for a point source at altitude (radians): ~0.2 mag/airmass. */
float extinction(float altRad) {
  float x = clamp(airmass(altRad), 1.0, 40.0);
  return pow(10.0, -0.4 * 0.2 * (x - 1.0));
}
`;
