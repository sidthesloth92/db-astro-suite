/**
 * ASCII folder-tree illustrations for the Sortronomy "before / after" output
 * section. Kept as bound string constants (not inline template text) so the
 * Angular compiler's whitespace collapsing never disturbs their alignment —
 * the `<pre>` renders them verbatim with `white-space: pre`.
 */

/** A flat, unsorted capture dump — hundreds of frames, inconsistent names. */
export const SORTRONOMY_TREE_BEFORE = `~/Captures/
├─ 2026-05-28_2130_Light_120s.fit
├─ 2026-05-28_2132_Light_120s.fit
├─ 2026-05-28_2134_Light_120s.fit
├─ Light_0001.fit
├─ Light_0002.fit
├─ M31_Ha_300s.fit
├─ ASI2600_NGC7000.fit
├─ Dark_-10C_120s.fit
├─ Flat_Ha_001.fit
├─ Bias_0001.fit
└─ … 1,274 more frames`;

/**
 * The same frames after Sortronomy: classified by camera → focal length →
 * target → session date → filter. Shows every classification mode — a mono
 * rig split into per-filter folders, a one-shot-colour rig with a tagged
 * filter folder, a second normalised camera, and calibration grouped by type.
 */
export const SORTRONOMY_TREE_AFTER = `~/Organised/
├─ ASI2600MM Pro/  (mono camera)
│  └─ 530mm/  (focal length)
│     └─ M31/  (target)
│        └─ 2026-05-28/  (session date)
│           ├─ Ha/    48 lights  (one folder per filter)
│           ├─ OIII/  36 lights
│           └─ SII/   36 lights
├─ ASI2600MC Pro/  (one-shot colour)
│  └─ 250mm/
│     └─ Veil Nebula/
│        └─ 2026-05-30/
│           └─ OSC · L-eXtreme/  42  (filter tagged)
├─ ASI183MM/  (second rig, normalised)
│  └─ 1000mm/
│     └─ Jupiter/
│        └─ 2026-05-31/
│           └─ L/    900 frames
└─ Calibration/  (grouped by frame type)
   ├─ Darks/   40
   ├─ Flats/   30
   └─ Bias/    50`;
