# Planetarium rendering design ("Your Universe")

Status: in progress (started 2026-10-24). Branch `feat/celestory-planetarium`, PRs target `celestory`.

## Goal

Make the planetarium a visually stunning, physically grounded night sky that people return to.
No compromises on rendering quality. Everything is written in-house (WebGL2 + Canvas 2D);
no Stellarium engine, no three.js. Target images are out of scope (users will upload them later;
the marker keeps an empty thumbnail slot for that).

## What stays

- All positional astronomy in `utils/celestial.util.ts` (RA/Dec → Alt/Az, ENU vectors, LST).
- `SkyLocationStore`, the location editor, the DOM target markers + `TargetDetail` popup.
- Drag / wheel / pinch interaction (extended with inertia and zoom-at-cursor).

## What changes

Two stacked canvases inside `.sky-root`:

1. **`<canvas #gl>` (WebGL2)** draws the sky itself through an HDR pipeline.
2. **`<canvas #cv>` (2D, transparent)** draws lines and text on top: graticule, constellation
   figures + names, equator / ecliptic / meridian, cardinal points, star names, and it still
   positions the DOM markers. Replaces `planetarium-renderer.util.ts`.

Both use the same **stereographic projection** (`utils/sky-projection.util.ts`), which is
conformal (stars stay round, no edge stretching) and supports fields of view from 1° to 150°.

### HDR pipeline (per frame)

| Pass | What | Notes |
| --- | --- | --- |
| Sky | Full-screen triangle. Per pixel: unproject → ENU → equatorial → sample the Milky Way equirect texture | Adds atmosphere (single-scattering Rayleigh + Mie, sun-driven: day, twilight, night), airglow near the horizon, a light-pollution dome (Bortle-ish level, user setting), extinction by airmass, zodiacal light along the ecliptic, and an opaque procedural horizon silhouette (fBm ridge line by azimuth) with fog |
| Survey | DSS2 colour HiPS tiles (CDS) when FOV < ~30°, cross-faded in | Real photographs of nebulae/galaxies appear as you zoom. HEALPix nested maths in `utils/healpix.util.ts`; tile scheduling + LRU cache in `utils/hips-tiles.util.ts`; image fetching in `services/hips-tile.service.ts` |
| Stars | Point sprites: Hipparcos (118k) always, Tycho-2 (≈430k, V < 10.5) lazily when FOV < 60° | Flux from magnitude, colour from B−V, Gaussian core + wide halo PSF, limiting magnitude tied to FOV, extinction + twinkle growing with airmass. Rendered additively into the HDR buffer so bright stars bloom naturally |
| Solar system | Sun (disc + glare), Moon (LROC texture, correct phase/orientation), 5 naked-eye planets | Low-precision Keplerian ephemeris (Meeus) in `utils/ephemeris.util.ts`, arcminute accuracy; unit tests against JPL Horizons fixtures |
| Bloom | Physically additive bloom: 5-level downsample (13-tap) / tent upsample chain | No threshold; weight ≈ 0.05 |
| Composite | Exposure (auto from sun altitude), filmic tone curve tuned for dark skies, subtle vignette, blue-noise dither | Dither is mandatory: 8-bit banding in night gradients is the first thing that reads as fake |

HDR buffer is RGBA16F (requires `EXT_color_buffer_float`); fallback RGBA8 with reduced bloom.
Mobile: DPR capped at 1.5, bloom at quarter resolution, 4k Milky Way texture instead of 8k.
If WebGL2 is unavailable the component shows a plain dark sky with the 2D overlay only and says so.

### Time

`SkyTimeStore` replaces the fixed `now`: play / pause, rate (1×, 60×, 600×, 3600×), scrub along a
sunset → sunrise timeline, "Now". Sun, moon, planets, twilight and the sky rotation all follow it.

### Later

AR mode on mobile (DeviceOrientation → heading/pitch). Settings panel (constellations, grid,
survey, labels, light pollution). Data credits popover (required by ODbL for DSS2 and asked for
by NASA SVS / ESA Gaia).

## Data assets (`public/sky/`)

Built by `scripts/build-sky-assets.mjs` from raw sources kept outside the repo
(`--src <dir>`). Only the built outputs are committed. Requires `ffmpeg` (EXR decode, WebP encode).

| File | Source | Licence / credit |
| --- | --- | --- |
| `milkyway-8k.webp`, `milkyway-4k.webp` | NASA SVS 4851 "Deep Star Maps 2020", `milkyway_2020_8k.exr` (Hipparcos/Tycho stars omitted; faint Gaia stars kept). J2000 equirectangular, RA increases to the left, centred on RA 0h. Stored as `pow(v / 0.4, 1/2.4)`; the shader decodes back to linear | NASA/Goddard Space Flight Center Scientific Visualization Studio; Gaia DR2: ESA/Gaia/DPAC |
| `stars-hip.bin` | Hipparcos (ESA 1997), VizieR I/239 via TAP | ESA Hipparcos |
| `stars-tyc.bin` | Tycho-2 (Høg et al. 2000), VizieR I/259 via TAP, V_T < 10.5, HIP duplicates removed. V = V_T − 0.090(B_T − V_T), B−V = 0.850(B_T − V_T) | ESA / Tycho-2 |
| `constellations.json` | d3-celestial `constellations.lines.json` + `constellations.json` + `starnames.json` | BSD-3, Olaf Frohn |
| `moon-2k.webp` | NASA SVS 4720 CGI Moon Kit, `lroc_color_poles_4k.tif` | NASA SVS / ASU LROC |
| (runtime) DSS2 colour tiles | `https://alasky.cds.unistra.fr/DSS/DSSColor` order 9, 512 px JPEG | ODbL-1.0; "Digitized Sky Survey - STScI/NASA, Colored & Healpixed by CDS" |

Packed star record (8 bytes, little-endian, sorted by magnitude ascending so the first N
records are the brightest N): `int16 x, y, z` (unit vector × 32767, J2000 equatorial),
`uint8 mag` (`round((V + 2) × 10)`), `int8 bv` (`round((B−V) × 50)`). File header: `"STR1"`,
`uint32 count`.

## Always night (default)

The planetarium exists to showcase the user's targets, so by default it renders a dark,
night-adapted sky whatever the clock says: `SkyLook.alwaysNight = true` zeroes sunlight and
moonlight scattering, skips the Sun disc, and pins exposure to `nightExposure`. The Moon disc,
planets and the full positional model still follow the simulated time, and the opening jump
becomes sun-only (end of astronomical twilight). Setting `alwaysNight: false` restores the
complete day / twilight / moonlight simulation described below.

## Units and calibration (as built)

- The sky is rendered in **cd/m²**: airglow 0.00025 at the zenith (van Rhijn brightening toward
  the horizon), full-Moon sky ≈ 0.008, civil-twilight end ≈ 3, noon zenith ≈ 3000. The sun
  "intensity" (3.7e5) was fitted to the scattering integral so a high noon zenith gives ~3000;
  the Moon is Sun × 2.5e-6 × illuminated fraction. Single scattering alone goes to zero past
  ~−10° sun altitude, so a small residual twilight glow (multiple scattering) is added.
- **Exposure** mimics an adapted eye: `E = 36 × (L0 / (L + L0))^k`, with `L` the zenith luminance
  from Sun *and* Moon (a full-Moon night would otherwise render as day) and `L0 = 0.0003`. The
  exponent `k` is 0.6 at night (so a moonlit sky still displays brighter than a dark one) rising to
  0.85 in daylight (so noon stays in range). Exposure is applied in the sky/star/survey passes so
  daytime values fit RGBA16F; the composite only tone-maps. Moonlight is scaled by 0.35 (artistic)
  so the Milky Way stays faintly visible under a bright Moon.
- **Opening instant:** the view opens on the darkest usable sky of the coming night (Sun and Moon
  considered; earliest instant within 1.3× of the darkest luminance), so an evening visit shows the
  night sky rather than twilight. A hint pill says why (dusk / after moonset) and **Now** returns to
  the live clock. Every visit starts from the live clock and leaving restores it, whatever the
  previous visit did with the time controls.
- **Night palette** follows Stellarium's: dark-site light pollution by default, blue airglow, a higher
  black floor on the Milky Way map (its off-band haze would otherwise grey the whole sky), visible
  scintillation everywhere (14% at the zenith, more through more air). Measured dark-sky background
  ≈ sRGB (18, 21, 32); moonlit ≈ (27, 41, 71).
- **Zoom at cursor** must compute the anchored sky point and the re-aim in the *target* camera state;
  mixing the eased FOV in makes trackpad wheel streams slide the view sideways instead of zooming.
  Trackpad pinch arrives as ctrl+wheel with tiny deltas and gets a 6× rate.
- **Performance shape:** the sky background renders at half resolution and is lifted with a bilinear
  blit (it is smooth); atmosphere marching is skipped entirely when the light intensity is zero
  (always-night); stars, bodies and the survey render at full resolution. The frame-rate governor
  lowers only the WebGL canvas's backing resolution, never the 2D text canvas, so labels stay crisp.
- **Judge brightness by pixel values** (`ffmpeg -vf crop=1:1:x:y`), not by image previews, which
  read brighter than the real pixels.
- The Milky Way map gets ~3× its physical surface brightness (every astrophoto does), and a
  magnification-dependent mip bias so its faint Gaia stars stay fine grain rather than blobs.
- Stars use a photographic magnitude compression (gamma 0.78 wide → 0.58 zoomed) so faint stars
  stay visible when zoomed in; bright stars get Moffat-wing halos and bloom.
- Catalogue positions (J2000) are precessed to date on the GPU; the Sun/Moon series are of-date.
- The survey (DSS2 colour) fades in from 34° to 20° FOV once its tiles arrive, additively over the
  airglow, with the Milky Way map fading out. Tile orientation was verified empirically: image x
  runs along the HEALPix cell's v axis, image y (down) along its u axis.

## Verification tooling

Dev builds expose `window.__sky` (`setTime`, `setLook`, `look`, `aim('moon'|'sun')`, `aimRaDec`,
`state`) so a Playwright script can set an instant, aim the camera and screenshot. Headless
Chromium needs `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## Phases / PRs

1. `feat(celestory): sky asset pipeline` — build script, assets, credits. ✅
2. `feat(celestory): WebGL sky renderer` — projection, HDR pipeline, Milky Way, stars, atmosphere,
   ground, bloom, tonemap, overlay restyle, marker restyle. ✅
3. `feat(celestory): solar system + twilight` — ephemeris, sun/moon/planets, time store + controls. ✅
4. `feat(celestory): deep-sky survey layer` — HEALPix + HiPS tiles. ✅
5. `feat(celestory): planetarium polish` — labels with collision avoidance, keyboard, point-at-the-sky
   mode, adaptive resolution. ✅ (settings popover deferred; the toolbar toggles cover the layers)

Still open: performance measurements on real GPUs (headless SwiftShader cannot tell), Tycho-2
density tuning on phones, a Saturn ring glyph at very narrow fields, user target images in the
marker slot.

## Verification

- Unit tests: projection round trip, HEALPix pix2ang/ang2pix against reference values, star
  packer/loader, ephemeris vs Horizons fixtures, constellation conversion.
- Visual: Playwright screenshots at a fixed location + instant compared by eye against
  known sky appearance (Orion rising, Milky Way core in summer dusk).
- Performance: 60 fps on a laptop at 1440p DPR 2; ≥ 30 fps on a mid-range phone.
