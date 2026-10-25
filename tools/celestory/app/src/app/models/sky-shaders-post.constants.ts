import { GLSL_COMMON } from './sky-shaders-common.constants';

/**
 * Ground pass: an opaque horizon silhouette (fBm ridge line by azimuth) with
 * fog that takes the sky's colour near the ridge. Drawn after stars so nothing
 * shows through the hills. Reads the HDR sky to tint the ground + fog.
 */
export const GROUND_FRAG = `#version 300 es
precision highp float;
${GLSL_COMMON}

uniform mat3 u_camToEnu;
uniform sampler2D u_sky;      /* exposed HDR buffer so far */
uniform float u_seed;
uniform vec3 u_groundLight;   /* exposed light falling on the ground (from the sky model, not the pixel) */
out vec4 o_color;

float ridge(float az) {
  float a = az / TWO_PI;
  float s = u_seed * 7.0;
  float h = 0.0;
  h += 1.00 * noise1(a * 7.0 + s);
  h += 0.50 * noise1(a * 17.0 + s * 1.7);
  h += 0.25 * noise1(a * 41.0 + s * 2.3);
  h += 0.12 * noise1(a * 97.0 + s * 3.1);
  h += 0.05 * noise1(a * 230.0 + s * 4.7);
  return (h - 0.55) * 0.03 + 0.012; /* radians: roughly −0.4° .. 2.3° */
}

void main() {
  vec3 camDir = unprojectDir(gl_FragCoord.xy);
  vec3 enu = normalize(u_camToEnu * camDir);
  float alt = asin(clamp(enu.z, -1.0, 1.0));
  float az = atan(enu.x, enu.y);
  float r = ridge(az);
  float below = r - alt;                     /* > 0 inside the ground */
  float aa = fwidth(alt) * 1.2;
  float mask = smoothstep(-aa, aa, below);
  vec3 sky = texture(u_sky, gl_FragCoord.xy / u_res).rgb;
  /* dark ground lit by the sky model (so bright bodies behind the hills cannot bleed through) */
  vec3 ground = u_groundLight * vec3(0.32, 0.30, 0.28) + vec3(0.9, 1.0, 1.3) * 0.0022;
  /* a thin band of fog just below the ridge carries the local sky colour */
  float fog = exp(-max(below, 0.0) / 0.006);
  vec3 col = mix(ground, min(sky, vec3(1.5)) * 0.35 + ground, fog * 0.6);
  o_color = vec4(mix(sky, col, mask), 1.0);
}
`;

/** 13-tap downsample (Jimenez 2014) — one bloom mip to the next. */
export const BLOOM_DOWN_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform vec2 u_texel; /* 1 / source size */
uniform float u_clamp;
out vec4 o_color;

void main() {
  vec2 uv = gl_FragCoord.xy * u_texel * 2.0;
  vec2 t = u_texel;
  vec3 a = texture(u_src, uv + vec2(-2.0, 2.0) * t).rgb;
  vec3 b = texture(u_src, uv + vec2(0.0, 2.0) * t).rgb;
  vec3 c = texture(u_src, uv + vec2(2.0, 2.0) * t).rgb;
  vec3 d = texture(u_src, uv + vec2(-2.0, 0.0) * t).rgb;
  vec3 e = texture(u_src, uv).rgb;
  vec3 f = texture(u_src, uv + vec2(2.0, 0.0) * t).rgb;
  vec3 g = texture(u_src, uv + vec2(-2.0, -2.0) * t).rgb;
  vec3 h = texture(u_src, uv + vec2(0.0, -2.0) * t).rgb;
  vec3 i = texture(u_src, uv + vec2(2.0, -2.0) * t).rgb;
  vec3 j = texture(u_src, uv + vec2(-1.0, 1.0) * t).rgb;
  vec3 k = texture(u_src, uv + vec2(1.0, 1.0) * t).rgb;
  vec3 l = texture(u_src, uv + vec2(-1.0, -1.0) * t).rgb;
  vec3 m = texture(u_src, uv + vec2(1.0, -1.0) * t).rgb;
  vec3 sum = e * 0.125;
  sum += (a + c + g + i) * 0.03125;
  sum += (b + d + f + h) * 0.0625;
  sum += (j + k + l + m) * 0.125;
  o_color = vec4(min(sum, vec3(u_clamp)), 1.0);
}
`;

/** 9-tap tent upsample, added onto the next-larger mip (additive blending set by caller). */
export const BLOOM_UP_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform vec2 u_texel; /* 1 / source size */
uniform vec2 u_dst;   /* 1 / destination size */
uniform float u_radius;
out vec4 o_color;

void main() {
  vec2 uv = gl_FragCoord.xy * u_dst;
  vec2 t = u_texel * u_radius;
  vec3 s = texture(u_src, uv + vec2(-t.x, t.y)).rgb;
  s += texture(u_src, uv + vec2(0.0, t.y)).rgb * 2.0;
  s += texture(u_src, uv + vec2(t.x, t.y)).rgb;
  s += texture(u_src, uv + vec2(-t.x, 0.0)).rgb * 2.0;
  s += texture(u_src, uv).rgb * 4.0;
  s += texture(u_src, uv + vec2(t.x, 0.0)).rgb * 2.0;
  s += texture(u_src, uv + vec2(-t.x, -t.y)).rgb;
  s += texture(u_src, uv + vec2(0.0, -t.y)).rgb * 2.0;
  s += texture(u_src, uv + vec2(t.x, -t.y)).rgb;
  o_color = vec4(s / 16.0, 1.0);
}
`;

/**
 * Composite: HDR + bloom → exposure → filmic curve → sRGB → dithered 8-bit.
 * The curve keeps a true black floor (no lifted blacks) while rolling off
 * highlights so saturated stars stay white rather than clipping to a colour.
 */
export const COMPOSITE_FRAG = `#version 300 es
precision highp float;
${GLSL_COMMON}
uniform sampler2D u_hdr;
uniform sampler2D u_bloom;
uniform float u_exposure;
uniform float u_bloomStrength;
uniform float u_vignette;
out vec4 o_color;

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 toSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(0.0031308, c));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 hdr = texture(u_hdr, uv).rgb;
  vec3 bloom = texture(u_bloom, uv).rgb;
  vec3 c = (hdr + bloom * u_bloomStrength) * u_exposure;
  /* gentle vignette, in linear light */
  vec2 q = (gl_FragCoord.xy - u_center) / u_res.y;
  c *= 1.0 - u_vignette * smoothstep(0.35, 1.1, length(q));
  c = aces(c);
  c = toSrgb(c);
  /* blue-noise-like dither to kill banding in the dark gradients */
  float n = ign(gl_FragCoord.xy) - 0.5;
  c += n / 255.0;
  o_color = vec4(c, 1.0);
}
`;

/** Bilinear upsample/copy of a texture over the whole target (used to lift the half-res sky). */
export const BLIT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform vec2 u_dst; /* 1 / destination size */
out vec4 o_color;
void main() {
  o_color = vec4(texture(u_src, gl_FragCoord.xy * u_dst).rgb, 1.0);
}
`;
