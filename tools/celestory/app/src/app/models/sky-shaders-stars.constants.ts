import { GLSL_COMMON } from './sky-shaders-common.constants';

/**
 * Star pass: one point sprite per catalogue record. Flux from magnitude,
 * colour from B−V via a blackbody LUT, Gaussian core + Moffat wings PSF,
 * extinction and scintillation growing with airmass, soft limiting-magnitude
 * fade. Rendered additively into the exposed HDR buffer.
 */
export const STARS_VERT = `#version 300 es
precision highp float;
${GLSL_COMMON}

in vec3 a_pos;     /* int16 normalised: J2000 unit vector */
in float a_mag;    /* uint8: (V + 2) × 10 */
in float a_bv;     /* int8: (B−V) × 50 */

uniform mat3 u_eqToEnu;
uniform mat3 u_enuToCam;
uniform float u_time;
uniform float u_starGain;
uniform float u_limitMag;
uniform float u_magGamma;     /* photographic compression of the magnitude scale (1 = physical) */
uniform float u_sizeScale;    /* device pixels per CSS pixel */
uniform float u_exposure;
uniform float u_maxPoint;     /* device's max point size */
uniform sampler2D u_colorLut; /* 256 × 1, B−V −0.5..2.5 → linear RGB */

out vec3 v_color;
out float v_core;    /* core sigma in px */
out float v_wing;    /* wing scale in px */
out float v_wingW;   /* wing weight */
out float v_radius;  /* sprite radius in px */

void main() {
  vec3 enu = u_eqToEnu * normalize(a_pos);
  vec3 c = u_enuToCam * enu;
  float mag = a_mag * 255.0 / 10.0 - 2.0;
  float alt = asin(clamp(enu.z, -1.0, 1.0));
  if (c.z <= -0.85 || enu.z < -0.02 || mag > u_limitMag + 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  vec2 px = projectDir(c);
  gl_Position = vec4(px / u_res * 2.0 - 1.0, 0.0, 1.0);

  /* exposed flux */
  float flux = pow(10.0, -0.4 * mag * u_magGamma) * u_starGain * u_exposure;
  flux *= extinction(alt);
  flux *= smoothstep(u_limitMag + 0.5, u_limitMag - 0.7, mag);

  /* scintillation: low stars twinkle harder and faster */
  float x = clamp(airmass(alt), 1.0, 10.0);
  float seed = dot(a_pos, vec3(12.9898, 78.233, 37.719));
  float tw = sin(u_time * (3.0 + 4.0 * hash11(seed)) + seed * 100.0) * 0.5 + 0.5;
  float tw2 = sin(u_time * (9.0 + 7.0 * hash11(seed + 1.0)) + seed * 57.0) * 0.5 + 0.5;
  /* visible everywhere (it is what makes a sky feel alive), stronger through more air */
  float amp = clamp(0.04 + 0.07 * (x - 1.0), 0.0, 0.35);
  float scint = 1.0 - amp * (0.6 * tw + 0.4 * tw2);
  flux *= scint;

  /* colour */
  float bv = a_bv * 127.0 / 50.0;
  vec3 col = texture(u_colorLut, vec2((bv + 0.5) / 3.0, 0.5)).rgb;

  /* PSF: Gaussian core (sigma ~1 css px) + Moffat wings. Sprite radius where the
     wings fall below a display-visibility floor. */
  /* a sharp point inside a wide, soft halo (sigma well under a CSS pixel on Retina);
     the halo carries most of the "dreamy" look and breathes with the scintillation */
  /* Hard pinpoint core (about one device pixel); halos only once a star is bright enough
     to deserve one, so faint stars never turn into dim fuzz. */
  float sigma = max(0.5 * u_sizeScale, 0.6);
  float wingAlpha = 2.8 * u_sizeScale * (0.95 + 0.05 * scint);
  float peak = flux / (TWO_PI * sigma * sigma);
  float wingW = 0.14 * smoothstep(0.25, 2.5, peak);
  float floorI = 0.01;
  float rw = wingW > 0.0 ? wingAlpha * sqrt(max(pow(peak * wingW / floorI, 1.0 / 1.8) - 1.0, 0.0)) : 0.0;
  float radius = clamp(max(rw, 3.0 * sigma), 1.5 * u_sizeScale, min(140.0 * u_sizeScale, u_maxPoint * 0.5));

  v_color = col * peak;
  v_core = sigma;
  v_wing = wingAlpha;
  v_wingW = wingW;
  v_radius = radius;
  gl_PointSize = radius * 2.0;
}
`;

export const STARS_FRAG = `#version 300 es
precision highp float;

in vec3 v_color;
in float v_core;
in float v_wing;
in float v_wingW;
in float v_radius;
out vec4 o_color;

void main() {
  vec2 d = (gl_PointCoord - 0.5) * 2.0 * v_radius;
  float r2 = dot(d, d);
  float core = exp(-r2 / (2.0 * v_core * v_core));
  float wing = v_wingW * pow(1.0 + r2 / (v_wing * v_wing), -1.8);
  float edge = 1.0 - smoothstep(v_radius * 0.85, v_radius, sqrt(r2));
  o_color = vec4(v_color * (core + wing) * edge, 1.0);
}
`;
