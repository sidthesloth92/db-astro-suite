# Sky data credits

Built by `scripts/build-sky-assets.mjs`. Do not edit the binary/image files by hand.

- **milkyway-8k.webp / milkyway-4k.webp** — NASA/Goddard Space Flight Center Scientific Visualization Studio,
  "Deep Star Maps 2020" (SVS 4851), Milky Way background with Hipparcos/Tycho stars omitted.
  Gaia DR2 data: ESA/Gaia/DPAC. Equirectangular J2000, RA increases to the left, centred on RA 0h.
  Stored as pow(v / 0.4, 1/2.4); decode to linear in the shader.
- **stars-hip.bin** — Hipparcos Catalogue (ESA 1997), VizieR I/239.
- **stars-tyc.bin** — Tycho-2 Catalogue (Høg et al. 2000), VizieR I/259, V_T < 10.5, Hipparcos duplicates removed.
- **sky-catalog.json** — constellation figures and star names from d3-celestial (Olaf Frohn, BSD-3-Clause).
- **moon-2k.webp** — NASA SVS "CGI Moon Kit" (SVS 4720), LROC WAC colour mosaic (NASA/GSFC/Arizona State University).
- **Deep-sky survey tiles (runtime)** — DSS2 colour HiPS, CDS: "Digitized Sky Survey - STScI/NASA, Colored & Healpixed by CDS", ODbL-1.0.
