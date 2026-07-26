/**
 * Terminal transcript + celestory.json excerpt for the Celestory "one scan,
 * one story" output section. Kept as bound string constants (not inline
 * template text) so the Angular compiler's whitespace collapsing never
 * disturbs their alignment — the `<pre>` renders them verbatim with
 * `white-space: pre`.
 */

/** A celestory scan as it plays out on the terminal. */
export const CELESTORY_TERMINAL = `$ celestory -input ~/Astro

  reading FITS headers … 12,489 files
  lights kept 11,208 · calibration skipped 1,281

  ✦ Your story so far
    19 targets · 214 nights
    412 h 36 m total integration
    first light 2019-11-02

  wrote ~/celestory.json

  ✦ Next steps
    drop celestory.json on
    https://celestory.dbastrosuite.com`;

/** The (trimmed) celestory.json the scan produces — no local paths inside. */
export const CELESTORY_JSON_EXCERPT = `{
  "schemaVersion": 3,
  "tool": { "name": "celestory" },
  "summary": {
    "totalIntegrationSeconds": 1485360,
    "targetCount": 19,
    "nightCount": 214,
    "lightFrameCount": 11208,
    "firstLight": "2019-11-02",
    "filters": ["Ha", "OIII", "SII", "OSC"]
  },
  "equipment": [
    { "camera": "ASI2600MM Pro", … },
    …
  ],
  "targets": [
    {
      "name": "M31",
      "integrationSeconds": 96120,
      "timeline": [ …per-session entries… ]
    },
    …
  ]
}`;
