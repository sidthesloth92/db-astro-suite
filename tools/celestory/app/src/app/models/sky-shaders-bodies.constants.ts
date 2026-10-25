import { GLSL_COMMON } from './sky-shaders-common.constants';

/**
 * Sun + Moon discs as screen-aligned point sprites. The Moon is a lit sphere:
 * the LROC colour map is looked up in a Moon-fixed frame (sub-Earth point at
 * the map centre, north toward the ecliptic pole), shaded by the real Sun
 * direction so the phase, its orientation and earthshine all fall out of the
 * geometry. Values are in exposed display units (the Moon is tone-mapped
 * locally so its surface stays readable at night).
 */
export const BODY_VERT = `#version 300 es
precision highp float;
${GLSL_COMMON}

uniform mat3 u_enuToCam;
uniform vec3 u_dirEnu;        /* body direction */
uniform float u_angRadius;    /* apparent angular radius, radians */
uniform float u_minRadiusPx;  /* floor so the disc stays visible when zoomed out */
uniform float u_spriteScale;  /* sprite = disc radius × this (room for the halo) */

out float v_discRadius;       /* disc radius in px */
out float v_spriteRadius;     /* sprite half-size in px */
out float v_visible;

void main() {
  vec3 c = u_enuToCam * u_dirEnu;
  if (c.z <= -0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    v_visible = 0.0;
    return;
  }
  vec2 px = projectDir(c);
  gl_Position = vec4(px / u_res * 2.0 - 1.0, 0.0, 1.0);
  float k = 2.0 / (1.0 + c.z);
  float discPx = max(u_angRadius * u_scale * k, u_minRadiusPx);
  v_discRadius = discPx;
  v_spriteRadius = discPx * u_spriteScale;
  v_visible = 1.0;
  gl_PointSize = v_spriteRadius * 2.0;
}
`;

export const MOON_FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_moonTex;
uniform vec3 u_dirEnu;        /* moon direction */
uniform vec3 u_sunEnu;        /* sun direction */
uniform vec3 u_poleEnu;       /* ecliptic north pole ≈ lunar north */
uniform vec3 u_camRight;      /* camera right, ENU */
uniform vec3 u_camUp;         /* camera up, ENU */
uniform float u_brightness;   /* exposed display value of the lit surface */

in float v_discRadius;
in float v_spriteRadius;
in float v_visible;
out vec4 o_color;

const float PI = 3.14159265358979;

void main() {
  if (v_visible < 0.5) discard;
  vec2 d = (gl_PointCoord - 0.5) * 2.0 * v_spriteRadius; /* px, y down */
  float r = length(d) / v_discRadius;
  if (r > 1.0) discard;
  /* sphere normal in screen space, then into ENU */
  vec2 q = vec2(d.x, -d.y) / v_discRadius;
  float w = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 n = normalize(q.x * u_camRight + q.y * u_camUp - w * u_dirEnu);

  /* Moon-fixed frame: X toward Earth, Z lunar north, Y = Z × X (east) */
  vec3 X = -u_dirEnu;
  vec3 Z = normalize(u_poleEnu - X * dot(u_poleEnu, X));
  vec3 Y = cross(Z, X);
  float lon = atan(dot(n, Y), dot(n, X));
  float lat = asin(clamp(dot(n, Z), -1.0, 1.0));
  vec2 uv = vec2(0.5 + lon / (2.0 * PI), 0.5 - lat / PI);
  vec3 albedo = pow(texture(u_moonTex, uv).rgb, vec3(2.2));

  float lambert = max(dot(n, u_sunEnu), 0.0);
  float earthshine = 0.012;
  vec3 col = albedo * (lambert + earthshine) * u_brightness;
  /* soft antialiased limb */
  float edge = 1.0 - smoothstep(0.97, 1.0, r);
  o_color = vec4(col * edge, edge);
}
`;

export const SUN_FRAG = `#version 300 es
precision highp float;

uniform float u_brightness;   /* exposed display value at the disc centre */

in float v_discRadius;
in float v_spriteRadius;
in float v_visible;
out vec4 o_color;

void main() {
  if (v_visible < 0.5) discard;
  vec2 d = (gl_PointCoord - 0.5) * 2.0 * v_spriteRadius;
  float r = length(d) / v_discRadius;
  if (r > 1.0) discard;
  /* limb darkening */
  float mu = sqrt(max(0.0, 1.0 - r * r));
  float ld = 0.4 + 0.6 * mu;
  float edge = 1.0 - smoothstep(0.96, 1.0, r);
  vec3 col = vec3(1.0, 0.97, 0.92) * u_brightness * ld;
  o_color = vec4(col * edge, edge);
}
`;
