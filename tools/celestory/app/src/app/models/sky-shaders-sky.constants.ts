import { GLSL_COMMON } from './sky-shaders-common.constants';

/**
 * Sky pass: per-pixel Milky Way (equirect texture), Nishita-style single
 * scattering for the sun and moon (day / twilight / moonlit nights), a
 * residual twilight glow, airglow, a light-pollution dome and zodiacal light.
 * Works in cd/m² and writes exposed linear HDR (radiance × u_exposure).
 */
export const SKY_FRAG = `#version 300 es
precision highp float;
${GLSL_COMMON}

uniform mat3 u_camToEnu;
uniform mat3 u_enuToEq;
uniform sampler2D u_milky;
uniform float u_milkyLod;
uniform float u_milkyGain;
uniform vec3 u_sunEnu;
uniform float u_sunI;           /* sun intensity (scattering units) */
uniform vec3 u_moonEnu;
uniform float u_moonI;          /* moon intensity, already × illuminated fraction */
uniform vec3 u_eclPoleEnu;      /* ecliptic north pole, ENU */
uniform float u_lightPollution; /* 0..1 */
uniform float u_airglow;        /* cd/m² at the zenith */
uniform float u_zodiacal;       /* cd/m² peak */
uniform float u_twilight;       /* residual twilight glow, cd/m² */
uniform float u_exposure;
uniform float u_milkyFade;      /* 1 = full Milky Way map, 0 = replaced by the survey */

out vec4 o_color;

/* ---- atmosphere (kilometres: keeps the sphere intersections inside float32 precision) ---- */
const float R_EARTH = 6371.0;
const float R_ATMO = 6471.0;
const vec3 BETA_R = vec3(5.8e-3, 13.5e-3, 33.1e-3);
const float BETA_M = 21e-3;
const float H_R = 8.0;
const float H_M = 1.2;
const float MIE_G = 0.76;

float raySphere(vec3 o, vec3 d, float r) {
  float b = dot(o, d);
  float c = dot(o, o) - r * r;
  float disc = b * b - c;
  if (disc < 0.0) return -1.0;
  return -b + sqrt(disc);
}

bool hitsEarth(vec3 o, vec3 d) {
  float b = dot(o, d);
  if (b >= 0.0) return false;
  float c = dot(o, o) - R_EARTH * R_EARTH;
  return b * b - c > 0.0;
}

/* Single scattering along dir from the ground for light source lightDir. */
vec3 scatter(vec3 dir, vec3 lightDir, float intensity, int steps, int lightSteps) {
  vec3 origin = vec3(0.0, 0.0, R_EARTH + 0.002);
  float tmax = raySphere(origin, dir, R_ATMO);
  float seg = tmax / float(steps);
  float mu = dot(dir, lightDir);
  float phaseR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  float g2 = MIE_G * MIE_G;
  float phaseM = 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + mu * mu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * MIE_G * mu, 1.5));
  vec3 sumR = vec3(0.0);
  vec3 sumM = vec3(0.0);
  float odR = 0.0;
  float odM = 0.0;
  float t = seg * 0.5;
  for (int i = 0; i < steps; i++) {
    vec3 p = origin + dir * t;
    float h = length(p) - R_EARTH;
    float hr = exp(-h / H_R) * seg;
    float hm = exp(-h / H_M) * seg;
    odR += hr;
    odM += hm;
    if (!hitsEarth(p, lightDir)) {
      float tl = raySphere(p, lightDir, R_ATMO);
      float lseg = tl / float(lightSteps);
      float odlR = 0.0;
      float odlM = 0.0;
      float tt = lseg * 0.5;
      for (int j = 0; j < lightSteps; j++) {
        vec3 q = p + lightDir * tt;
        float hq = length(q) - R_EARTH;
        odlR += exp(-hq / H_R) * lseg;
        odlM += exp(-hq / H_M) * lseg;
        tt += lseg;
      }
      vec3 tau = BETA_R * (odR + odlR) + BETA_M * 1.1 * (odM + odlM);
      vec3 att = exp(-tau);
      sumR += att * hr;
      sumM += att * hm;
    }
    t += seg;
  }
  return intensity * (sumR * BETA_R * phaseR + sumM * BETA_M * phaseM);
}

void main() {
  vec3 camDir = unprojectDir(gl_FragCoord.xy);
  vec3 enu = normalize(u_camToEnu * camDir);
  float alt = asin(clamp(enu.z, -1.0, 1.0));
  vec3 dirUp = normalize(vec3(enu.xy, max(enu.z, 0.0)));
  float z = max(enu.z, 0.0);

  /* --- Milky Way (texture units → cd/m²) --- */
  vec3 eq = u_enuToEq * enu;
  float ra = atan(eq.y, eq.x);
  float dec = asin(clamp(eq.z, -1.0, 1.0));
  vec2 uv = vec2(0.5 - ra / TWO_PI, 0.5 - dec / PI);
  vec3 mw = textureLod(u_milky, uv, u_milkyLod).rgb;
  mw = max(pow(mw, vec3(2.4)) * 0.4 - 0.0013, 0.0) * u_milkyGain; /* floor removes the map's off-band haze */
  /* soft knee: the galactic bulge is ~8× the Cygnus band in the map and would otherwise
     saturate into a white wedge when it sits low in the west */
  mw = mw / (1.0 + mw * 55.0);
  /* gentle grade: warm the bright core, cool the faint arms */
  float mwl = dot(mw, vec3(0.2126, 0.7152, 0.0722));
  mw *= mix(vec3(0.82, 0.92, 1.18), vec3(1.1, 1.0, 0.86), clamp(mwl / (u_milkyGain * 0.09), 0.0, 1.0));

  /* --- zodiacal light: a cone about the ecliptic, brightest toward the sun --- */
  float sunAlt = asin(clamp(u_sunEnu.z, -1.0, 1.0));
  float beta = asin(clamp(dot(enu, u_eclPoleEnu), -1.0, 1.0));
  float elong = acos(clamp(dot(enu, u_sunEnu), -1.0, 1.0));
  float zod = exp(-beta * beta / (2.0 * 0.22 * 0.22)) * exp(-max(elong - 0.35, 0.0) * 1.6);
  vec3 zodiacal = vec3(0.95, 0.9, 0.82) * zod * u_zodiacal;

  /* --- night sky: airglow (van Rhijn brightening toward the horizon) + light pollution --- */
  float vanRhijn = 1.0 / sqrt(max(1.0 - 0.9 * (1.0 - z * z), 0.1));
  vec3 airglow = vec3(0.42, 0.56, 1.0) * u_airglow * vanRhijn;
  float dome = pow(1.0 - z, 2.5);
  vec3 pollutionTint = vec3(1.0, 0.9, 0.78);
  vec3 pollution = pollutionTint * u_lightPollution * (0.0008 + 0.0025 * dome);

  /* --- residual twilight glow (multiple scattering), stronger toward the sun's azimuth --- */
  vec2 sunAz = normalize(u_sunEnu.xy + vec2(1e-5, 0.0));
  float towardSun = max(dot(normalize(enu.xy + vec2(1e-5, 0.0)), sunAz), 0.0);
  float tw = u_twilight * (0.3 + 0.7 * (0.35 + 0.65 * towardSun) * pow(1.0 - z, 1.5));
  vec3 twilight = vec3(0.55, 0.62, 0.9) * tw;

  /* --- sun + moon scattering --- */
  vec3 sunSky = u_sunI > 0.0 ? scatter(dirUp, u_sunEnu, u_sunI, 8, 4) : vec3(0.0);
  /* Below −4° the few light samples miss the dense low atmosphere on the grazing path and
     single scattering overstates the twilight arch ~50× by −12°; depress it exponentially
     (the residual twilight term carries the real, faint glow). */
  float sunAltDeg = sunAlt * 57.2957795;
  sunSky *= sunAltDeg >= -4.0 ? 1.0 : exp((sunAltDeg + 4.0) / 2.2);
  /* Ozone (Chappuis band) absorbs orange along the long twilight path: the blue hour. */
  float ozone = clamp(-sunAltDeg / 4.0, 0.0, 2.0);
  sunSky *= pow(vec3(0.74, 0.86, 1.0), vec3(ozone));
  vec3 moonSky = u_moonI > 0.0 ? scatter(dirUp, u_moonEnu, u_moonI, 4, 2) * vec3(0.8, 0.92, 1.12) : vec3(0.0);

  /* diffuse light is extinguished less than point sources */
  float ext = mix(1.0, extinction(alt), 0.85);
  vec3 radiance = (mw * u_milkyFade + zodiacal) * ext + airglow + pollution + twilight + sunSky + moonSky;
  o_color = vec4(max(radiance, 0.0) * u_exposure, 1.0);
}
`;
