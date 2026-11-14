// GLSL ES 3.00 sources for the 3D scene. Image rows are uploaded top-first, so v = 0 is the
// top of every texture.

/**
 * Backdrop: a grid over the photo, one unit away. Each vertex is pushed toward the resting
 * camera along its own line of sight by the nebula depth, so the resting view is undistorted
 * and only camera movement reveals the relief.
 */
export const BACKDROP_VERTEX_SHADER = `#version 300 es
in vec2 aUv;
uniform sampler2D uDepth;
uniform float uRelief;
uniform float uAspect;
uniform mat4 uViewProjection;
out vec2 vUv;
void main() {
  vUv = aUv;
  float depth = texture(uDepth, aUv).r;
  vec3 onPlane = vec3((aUv.x - 0.5) * uAspect, 0.5 - aUv.y, -1.0);
  gl_Position = uViewProjection * vec4(onPlane * (1.0 - uRelief * depth), 1.0);
}`;

/** Backdrop colour: the starless photo, cross-faded to the original when the stars return. */
export const BACKDROP_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uStarless;
uniform sampler2D uPhoto;
uniform float uPhotoMix;
out vec4 outColor;
void main() {
  outColor = vec4(mix(texture(uStarless, vUv).rgb, texture(uPhoto, vUv).rgb, uPhotoMix), 1.0);
}`;

/** Stars: one camera-facing quad per star, sized and placed by the star volume. */
export const STAR_VERTEX_SHADER = `#version 300 es
in vec2 aCorner;
in vec3 aPosition;
in vec2 aHalf;
in float aAlpha;
in vec4 aRect;
in vec3 aColor;
in float aAmp;
in float aSpike;
in float aExtent;
in float aKind;
uniform mat4 uView;
uniform mat4 uProjection;
out vec2 vUv;
out vec2 vLocal;
out float vAlpha;
out vec3 vColor;
out float vAmp;
out float vSpike;
out float vExtent;
out float vKind;
void main() {
  vec4 inView = uView * vec4(aPosition, 1.0);
  // The quad turns with the picture, so a cut-out stays lined up with the photo it came from.
  inView.xy += mat2(uView) * (aCorner * aHalf);
  gl_Position = uProjection * inView;
  // The top of the quad (corner.y = +1) is the top row of the cut-out (v = rect.y).
  vUv = vec2(mix(aRect.x, aRect.z, aCorner.x * 0.5 + 0.5), mix(aRect.y, aRect.w, 0.5 - aCorner.y * 0.5));
  vLocal = aCorner * aExtent;
  vAlpha = aAlpha;
  vColor = aColor;
  vAmp = aAmp;
  vSpike = aSpike;
  vExtent = aExtent;
  vKind = aKind;
}`;

/**
 * Star colour. Original style samples the star's cut-out from the atlas. Sharp style draws a
 * Moffat profile (sharp core, soft wings) in the star's colour, white-hot at the centre, with
 * optional four-point spikes. vLocal is in half-widths; vKind 1 draws spikes only (giant stars
 * keep the photo's own core and glow).
 */
export const STAR_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vLocal;
in float vAlpha;
in vec3 vColor;
in float vAmp;
in float vSpike;
in float vExtent;
in float vKind;
uniform sampler2D uAtlas;
uniform float uSharp;
out vec4 outColor;
void main() {
  if (uSharp < 0.5) {
    outColor = vec4(texture(uAtlas, vUv).rgb * vAlpha, 1.0);
    return;
  }
  // 0.3195 makes the profile fall to half its peak at one half-width (Moffat, beta 2.5).
  float core = pow(1.0 + 0.3195 * dot(vLocal, vLocal), -2.5);
  float light = vAmp * core * (1.0 - vKind);
  if (vSpike > 0.0) {
    float reach = 2.5 + 5.0 * vSpike;
    vec2 a = abs(vLocal);
    float horizontal = exp(-a.y * 2.4) / (1.0 + (a.x * a.x) / (reach * reach));
    float vertical = exp(-a.x * 2.4) / (1.0 + (a.y * a.y) / (reach * reach));
    float edge = 1.0 - smoothstep(0.55, 1.0, max(a.x, a.y) / vExtent);
    light += vAmp * 0.5 * (horizontal + vertical) * edge;
  }
  vec3 color = mix(vColor, vec3(1.0), smoothstep(0.55, 1.1, light)) * min(light, 1.0);
  outColor = vec4(color * vAlpha, 1.0);
}`;
