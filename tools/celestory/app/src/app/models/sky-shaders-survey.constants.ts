/**
 * Survey pass: textured tile meshes (positions already projected to
 * framebuffer pixels on the CPU). JPEG tiles are decoded to linear light, the
 * plate background subtracted, scaled to cd/m² and exposed; blended additively
 * over the sky so nebulae add light on top of airglow.
 */
export const SURVEY_VERT = `#version 300 es
precision highp float;
in vec2 a_px;
in vec2 a_uv;
uniform vec2 u_res;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_px / u_res * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const SURVEY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tile;
uniform float u_black;    /* plate background level (sRGB 0..1) */
uniform float u_gain;     /* linear → cd/m² */
uniform float u_exposure;
uniform float u_weight;   /* fade 0..1 */
in vec2 v_uv;
out vec4 o_color;
void main() {
  vec3 srgb = texture(u_tile, v_uv).rgb;
  vec3 lin = pow(max(srgb - u_black, 0.0) / (1.0 - u_black), vec3(2.2));
  /* soft knee: photographic plates saturate hard; keep some tone in the brightest cores */
  lin = lin / (1.0 + lin * 0.6);
  o_color = vec4(lin * u_gain * u_exposure * u_weight, 1.0);
}
`;
