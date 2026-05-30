import sqlite3 from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { parse } from "csv-parse/sync";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The generated catalog is built off-box by this script and rsynced onto the
// host-mounted volume at runtime — exactly like the Astrometry.net FITS
// indexes. It is NOT committed to git and NOT baked into the Docker image
// (see .dockerignore / .gitignore). Run `npm run init-db` to (re)build it.
const dbPath = path.join(
  __dirname,
  "../../data/local-catalog/celestial.sqlite",
);

// URLs for Pro-Grade Catalogs
const OPEN_NGC_URL =
  "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv";

// VizieR TAP (ADQL) endpoint shared by the deep-sky-object loaders.
const VIZIER_TAP_URL = "https://tapvizier.u-strasbg.fr/TAPVizieR/tap/sync";

// ESA Gaia archive TAP endpoint for the Gaia DR3 G≤15 stellar fetch.
const GAIA_TAP_URL = "https://gea.esac.esa.int/tap-server/tap/sync";

// Faintest Gaia G magnitude to ingest. G≤15 is ~90M stars — bright enough to
// be useful labels without dragging in the full ~1.8B-row catalog.
const GAIA_MAG_LIMIT = 15;

// RA/Dec tile size (degrees) for the Gaia sweep. A single TAP sync request
// caps at a few million rows, so the sky is split into tiles.
const GAIA_TILE_DEG = 10;

// How many Gaia tiles to fetch concurrently. The sky is ~648 tiles at 10°;
// fetching them one at a time means ~648 sequential ESA round-trips (hours).
// A bounded pool turns that into ~20–40 min without hammering ESA. Tune down
// if ESA starts returning 429/503.
const GAIA_FETCH_CONCURRENCY = 6;

// Per-tile retry budget. A tile that fails (transient ESA 5xx, network blip)
// is retried with linear backoff before being given up on and skipped.
const GAIA_TILE_MAX_ATTEMPTS = 3;

// Retry budget for VizieR fetches. VizieR occasionally drops a connection
// ("socket hang up") under load; a couple of retries with backoff turns those
// transient failures into success instead of a whole catalog seeding 0 rows.
const VIZIER_MAX_ATTEMPTS = 3;

/**
 * Fetches a VizieR `asu-tsv` table and returns its non-comment data lines.
 * Mirrors the proven Sh2/ACO loaders: filters out comment (`#`), separator
 * (`-`), and blank lines so callers only see data rows. Transient network
 * failures are retried with linear backoff.
 *
 * @param {string} source - VizieR `-source` table id (e.g. "VII/237/pgc")
 * @param {string} out - Comma-separated `-out` column list
 * @param {number} [max=99999] - `-out.max` row cap
 * @returns {Promise<string[]>} Data lines (tab-separated)
 */
async function fetchVizierTsv(source, out, max = 99999) {
  let lastErr;
  for (let attempt = 1; attempt <= VIZIER_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(
        "https://vizier.cds.unistra.fr/viz-bin/asu-tsv",
        {
          params: { "-source": source, "-out": out, "-out.max": String(max) },
          responseType: "text",
          timeout: 300000,
        },
      );
      return response.data
        .split("\n")
        .filter(
          (l) => l && !l.startsWith("#") && !l.startsWith("-") && l.trim(),
        );
    } catch (err) {
      lastErr = err;
      if (attempt < VIZIER_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }
  }
  throw lastErr;
}

/**
 * Performs an `axios.get` with the same retry/backoff policy as VizieR fetches.
 * Used by the inline loaders (Hipparcos, Tycho) that issue bespoke requests not
 * covered by fetchVizierTsv, so a transient "socket hang up" no longer wipes a
 * catalog for the whole run.
 *
 * @param {string} url
 * @param {object} options - axios request options
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function axiosGetWithRetry(url, options) {
  let lastErr;
  for (let attempt = 1; attempt <= VIZIER_MAX_ATTEMPTS; attempt++) {
    try {
      return await axios.get(url, options);
    } catch (err) {
      lastErr = err;
      if (attempt < VIZIER_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }
  }
  throw lastErr;
}

// Catalog tags owned by the small/fast "original" loaders that run inline in
// seed(). They are loaded as one group under the "inline_originals" progress
// key: cleared and re-fetched together when not yet loaded, skipped wholesale
// once recorded. --rebuild forces a reload.
const INLINE_LOADER_TAGS = [
  "NGC/IC", "Star", "M", "C", "Sh2", "ACO", "HIP", "TYC", "Named", "Neb",
];

// Subset of INLINE_LOADER_TAGS that must end up with rows for the group to be
// considered successfully loaded. Excludes "Star": OpenNGC currently contains
// no Star-type rows, so that tag is legitimately empty and must not gate
// completion (otherwise the group would re-fetch on every run forever).
const INLINE_REQUIRED_TAGS = [
  "NGC/IC", "M", "C", "Sh2", "ACO", "HIP", "TYC", "Named", "Neb",
];

// Pass --rebuild (or REBUILD=1) to wipe everything and rebuild from scratch.
const REBUILD =
  process.argv.includes("--rebuild") || process.env.REBUILD === "1";

/**
 * True when a previously-completed loader recorded itself in load_progress.
 * Always false under --rebuild so every source re-fetches.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} source
 * @returns {boolean}
 */
function isLoaded(db, source) {
  if (REBUILD) return false;
  const row = db
    .prepare("SELECT rows FROM load_progress WHERE source = ?")
    .get(source);
  return row != null;
}

/**
 * Records a loader as complete with its row count (idempotent upsert).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} source
 * @param {number} rows
 */
function markLoaded(db, source, rows) {
  db.prepare(
    `INSERT INTO load_progress (source, rows, completed_at)
       VALUES (?, ?, datetime('now'))
     ON CONFLICT(source) DO UPDATE SET rows = excluded.rows, completed_at = excluded.completed_at`,
  ).run(source, rows);
}

/**
 * Deletes all rows owned by the given catalog tags. Used to clear stale/partial
 * data before a loader re-inserts, so re-runs never duplicate rows.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} tags
 */
function clearCatalogs(db, tags) {
  if (tags.length === 0) return;
  const placeholders = tags.map(() => "?").join(",");
  db.prepare(`DELETE FROM objects WHERE catalog IN (${placeholders})`).run(...tags);
}

/**
 * Skip-or-run wrapper for the expensive catalog loaders. Skips entirely when
 * the source is already recorded complete; otherwise clears the source's tags
 * (removing any partial rows from a prior crash), runs the loader, and records
 * completion with the resulting row count. A loader that legitimately yields 0
 * rows (e.g. a bad table id) is NOT marked complete, so it retries next run.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} source - Stable progress key
 * @param {string[]} tags - Catalog tags this loader owns
 * @param {() => Promise<number>} fn - Loader returning the number of rows inserted
 */
async function runStep(db, source, tags, fn) {
  if (isLoaded(db, source)) {
    console.log(`✓ ${source} already loaded — skipping.`);
    return;
  }
  clearCatalogs(db, tags);
  const n = await fn();
  if (n > 0) markLoaded(db, source, n);
}

async function seed() {
  console.log("--- Master Seeder: Initializing Galactic Atlas ---");
  if (REBUILD) console.log("--rebuild: wiping existing catalog for a clean build.");

  // Keep the output path predictable so the runtime service and Docker image agree.
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = sqlite3(dbPath);

  // --rebuild starts from zero; otherwise the table (and prior progress)
  // persists so a re-run only fetches what is missing or stale.
  if (REBUILD) {
    db.exec(`
      DROP TABLE IF EXISTS objects;
      DROP TABLE IF EXISTS objects_rtree;
      DROP TABLE IF EXISTS load_progress;
      DROP TABLE IF EXISTS gaia_tiles;
    `);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS objects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog TEXT,
      entryId TEXT,
      name TEXT,
      commonName TEXT,
      type TEXT,
      ra REAL,
      dec REAL,
      magnitude REAL,
      sizeArcmin REAL
    );
    CREATE INDEX IF NOT EXISTS idx_coords ON objects (ra, dec);
    CREATE TABLE IF NOT EXISTS load_progress (
      source TEXT PRIMARY KEY,
      rows INTEGER,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS gaia_tiles (
      tile_key TEXT PRIMARY KEY,
      rows INTEGER,
      completed_at TEXT
    );
  `);

  // Shared insert statement for every loader. Hoisted here (rather than inside
  // the OpenNGC block) so it exists even when the inline group is skipped on a
  // re-run. All catalog imports normalize into the same table shape.
  const insert = db.prepare(`
    INSERT INTO objects (catalog, entryId, name, commonName, type, ra, dec, magnitude, sizeArcmin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // The small "original" catalogs (OpenNGC, Sh2, ACO, Hipparcos, Tycho, named
  // stars, special DSOs) are loaded as one group, skipped wholesale on a
  // re-run once recorded; --rebuild forces a reload.
  //
  // IMPORTANT: do NOT clear the group's rows up front. Each loader clears its
  // own catalog tags *inside* its own insert transaction (see clearAndInsert),
  // so a download failure or interruption rolls back and leaves the prior rows
  // intact — rather than the old behaviour, which deleted everything up front
  // and could leave catalogs permanently empty if the run was interrupted
  // mid-reload.
  const inlineOriginalsLoaded = isLoaded(db, "inline_originals");
  if (inlineOriginalsLoaded) {
    console.log("✓ Original catalogs (OpenNGC/Sh2/ACO/HIP/TYC/named) already loaded — skipping.");
  }

  try {
    if (inlineOriginalsLoaded) {
      // no-op: the inline original catalogs are already present
    } else {
    console.log("Downloading OpenNGC Database (NGC, IC, Messier, Caldwell)...");
    const response = await axios.get(OPEN_NGC_URL);
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";", // OpenNGC uses semicolon
    });

    db.transaction(() => {
      // Clear + reinsert in one transaction: an interrupted run rolls back and
      // leaves the prior rows intact (these tags are owned by OpenNGC).
      clearCatalogs(db, ["NGC/IC", "Star", "M", "C"]);
      // Fix: OpenNGC uses sexagesimal coordinates (05:40:53.3 and -01:29:58)
      // We must translate these to decimal degrees. RA is in Hours (1 hr = 15 deg).
      function parseRA(raStr) {
        if (!raStr) return null;
        const p = raStr.split(":").map(Number);
        if (p.length !== 3) return parseFloat(raStr);
        return (p[0] + p[1] / 60 + p[2] / 3600) * 15;
      }

      function parseDec(decStr) {
        if (!decStr) return null;
        const p = decStr.split(":").map(Number);
        if (p.length !== 3) return parseFloat(decStr);
        const sign = decStr.trim().startsWith("-") ? -1 : 1;
        const d = Math.abs(p[0]) + p[1] / 60 + p[2] / 3600;
        return sign * d;
      }

      for (const row of records) {
        // Only import objects with valid coordinates
        if (!row.RA || !row.Dec) continue;

        let catalog = row.Type === "Star" ? "Star" : "NGC/IC";
        const entryId = row.Name;
        const name = row.Name;
        const commonName = row.Common_names || null;
        const type = row.Type;
        const ra = parseRA(row.RA);
        const dec = parseDec(row.Dec);
        const magnitude = parseFloat(row.Mag) || 15;
        // MajAx is the major axis in arcmin in OpenNGC
        const sizeArcmin = parseFloat(row.MajAx) || null;

        insert.run(
          catalog,
          entryId,
          name,
          commonName,
          type,
          ra,
          dec,
          magnitude,
          sizeArcmin,
        );

        // Messier cross-reference
        if (row.Messier) {
          insert.run(
            "M",
            `M${row.Messier}`,
            `M ${row.Messier}`,
            commonName || name,
            "M",
            ra,
            dec,
            magnitude,
            sizeArcmin,
          );
        }

        // Caldwell cross-reference
        if (row.Caldwell) {
          insert.run(
            "C",
            `C${row.Caldwell}`,
            `C ${row.Caldwell}`,
            commonName || name,
            "C",
            ra,
            dec,
            magnitude,
            sizeArcmin,
          );
        }
      }
    })();

    console.log(`OpenNGC Seeding Complete: ${records.length} objects added.`);

    // --- Sharpless (Sh2) Catalog: HII Emission Nebulae ---
    console.log("Downloading Sharpless Sh2 catalog from VizieR...");
    try {
      // VizieR Sharpless 1959 catalog. The VII/20H/sharpless table returns an
      // empty body; VII/20/catalog is the live table (~313 HII regions).
      const sh2Response = await axiosGetWithRetry(
        "https://vizier.cds.unistra.fr/viz-bin/asu-tsv",
        {
          params: {
            "-source": "VII/20/catalog",
            "-out": "_RAJ2000,_DEJ2000,Sh2,Diam",
            "-out.max": "9999",
          },
          responseType: "text",
        },
      );

      const sh2Lines = sh2Response.data
        .split("\n")
        .filter(
          (l) => l && !l.startsWith("#") && !l.startsWith("-") && l.trim(),
        );

      let sh2Count = 0;
      const sh2Insert = db.transaction(() => {
        clearCatalogs(db, ["Sh2"]);
        for (const line of sh2Lines) {
          const cols = line.split("\t").map((c) => c.trim());
          if (cols.length < 3) continue;
          const ra = parseFloat(cols[0]);
          const dec = parseFloat(cols[1]);
          const sh2Num = cols[2];
          const diam = parseFloat(cols[3]) || null;
          if (isNaN(ra) || isNaN(dec) || !sh2Num) continue;
          insert.run(
            "Sh2",
            `Sh2-${sh2Num}`,
            `Sh2 ${sh2Num}`,
            null,
            "HII",
            ra,
            dec,
            null,
            diam,
          );
          sh2Count++;
        }
      });
      sh2Insert();
      console.log(`Sharpless Sh2 catalog seeded: ${sh2Count} nebulae.`);
    } catch (err) {
      console.warn(
        "Sharpless catalog download failed (skipping):",
        err.message,
      );
    }

    // --- Abell Galaxy Clusters (ACO) ---
    console.log("Downloading Abell Galaxy Clusters (ACO) from VizieR...");
    try {
      const acoResponse = await axios.get(
        "https://vizier.cds.unistra.fr/viz-bin/asu-tsv",
        {
          params: {
            "-source": "VII/110A/table3",
            "-out": "_RAJ2000,_DEJ2000,ACO,m10,Diam",
            "-out.max": "9999",
          },
          responseType: "text",
        },
      );

      const acoLines = acoResponse.data
        .split("\n")
        .filter(
          (l) => l && !l.startsWith("#") && !l.startsWith("-") && l.trim(),
        );

      let acoCount = 0;
      const acoInsert = db.transaction(() => {
        clearCatalogs(db, ["ACO"]);
        for (const line of acoLines) {
          const cols = line.split("\t").map((c) => c.trim());
          if (cols.length < 3) continue;
          const ra = parseFloat(cols[0]);
          const dec = parseFloat(cols[1]);
          const acoNum = cols[2];
          const mag = parseFloat(cols[3]) || null;
          const diam = parseFloat(cols[4]) || null;
          if (isNaN(ra) || isNaN(dec) || !acoNum) continue;
          insert.run(
            "ACO",
            `Abell ${acoNum}`,
            `Abell ${acoNum}`,
            null,
            "GClus",
            ra,
            dec,
            mag,
            diam,
          );
          acoCount++;
        }
      });
      acoInsert();
      console.log(`Abell Galaxy Clusters (ACO) seeded: ${acoCount} clusters.`);
    } catch (err) {
      console.warn("ACO catalog download failed (skipping):", err.message);
    }

    // --- Hipparcos Catalog (I/239/hip_main) - Tier 2: Accurate positions for HD stars ---
    // Hipparcos has milliarcsecond accuracy vs the 1920s photographic plate errors in III/135A.
    // We store these as catalog='HIP' so solve.js can prefer them over catalog='HD' entries.
    // The frontend detects them as HD stars via name.startsWith('HD ') — no UI changes needed.
    console.log(
      "Downloading Hipparcos catalog for accurate HD star positions (~118k stars)...",
    );
    try {
      const hipResponse = await axiosGetWithRetry(
        "https://vizier.cds.unistra.fr/viz-bin/asu-tsv",
        {
          params: {
            "-source": "I/239/hip_main",
            "-out": "_RAJ2000,_DEJ2000,HD,Vmag",
            // VizieR returns an empty body for "-out.max=unlimited" on this
            // table (server-side policy/load), which silently seeded 0 rows.
            // Hipparcos main is ~118k stars, so a concrete cap reliably returns
            // the full set.
            "-out.max": "200000",
          },
          responseType: "text",
          timeout: 300000,
        },
      );

      const hipLines = hipResponse.data
        .split("\n")
        .filter(
          (l) => l && !l.startsWith("#") && !l.startsWith("-") && l.trim(),
        );

      let hipCount = 0;
      const hipInsert = db.transaction(() => {
        clearCatalogs(db, ["HIP"]);
        for (const line of hipLines) {
          const cols = line.split("\t").map((c) => c.trim());
          if (cols.length < 3) continue;
          const ra = parseFloat(cols[0]);
          const dec = parseFloat(cols[1]);
          const hdNum = cols[2];
          const _hipParsed = parseFloat(cols[3]);
          const mag = isNaN(_hipParsed) ? null : _hipParsed;
          // Skip entries with no HD number (many Hipparcos stars lack HD identifiers)
          if (isNaN(ra) || isNaN(dec) || !hdNum || hdNum === "") continue;
          insert.run(
            "HIP",
            `HD ${hdNum}`,
            `HD ${hdNum}`,
            null,
            "Star",
            ra,
            dec,
            mag,
            null,
          );
          hipCount++;
        }
      });
      hipInsert();
      console.log(
        `Hipparcos catalog seeded: ${hipCount} HD stars with accurate positions.`,
      );
    } catch (err) {
      console.warn(
        "Hipparcos catalog download failed (skipping):",
        err.message,
      );
    }

    // --- Tycho-2 HD Cross-Match ---
    // Accurate modern positions (20–100 mas) for HD stars not in Hipparcos.
    // Uses the Wright et al. 2003 HD-to-Tycho-2 cross-match (III/231/appdxb)
    // joined against Tycho-2 main positions (I/259/tyc2) via VizieR TAP.
    console.log(
      "Downloading Tycho-2 HD cross-match from VizieR TAP (~110k stars, may take a moment)...",
    );
    try {
      const tycQuery = [
        "SELECT b.HD, t.RAmdeg, t.DEmdeg, t.VTmag",
        'FROM "III/231/appdxb" AS b',
        'JOIN "I/259/tyc2" AS t ON (b.TYC1=t.TYC1 AND b.TYC2=t.TYC2 AND b.TYC3=t.TYC3)',
        "WHERE b.HD IS NOT NULL",
      ].join(" ");
      const tycResponse = await axiosGetWithRetry(
        "https://tapvizier.u-strasbg.fr/TAPVizieR/tap/sync",
        {
          params: {
            REQUEST: "doQuery",
            LANG: "ADQL",
            FORMAT: "tsv",
            MAXREC: 200000,
            QUERY: tycQuery,
          },
          responseType: "text",
          timeout: 300000,
        },
      );

      const tycLines = tycResponse.data
        .split("\n")
        .filter(
          (l) => l && !l.startsWith("#") && !l.startsWith("-") && l.trim(),
        );

      let tycCount = 0;
      const tycInsert = db.transaction(() => {
        clearCatalogs(db, ["TYC"]);
        for (const line of tycLines) {
          const cols = line.split("\t").map((c) => c.trim());
          if (cols.length < 4) continue;
          const hdNum = cols[0];
          const ra = parseFloat(cols[1]);
          const dec = parseFloat(cols[2]);
          const _tycParsed = parseFloat(cols[3]);
          const mag = isNaN(_tycParsed) ? null : _tycParsed;
          if (isNaN(ra) || isNaN(dec) || !hdNum) continue;
          insert.run(
            "TYC",
            `HD ${hdNum}`,
            `HD ${hdNum}`,
            null,
            "Star",
            ra,
            dec,
            mag,
            null,
          );
          tycCount++;
        }
      });
      tycInsert();
      console.log(
        `Tycho-2 catalog seeded: ${tycCount} HD stars with accurate positions.`,
      );
    } catch (err) {
      console.warn("Tycho-2 catalog download failed (skipping):", err.message);
    }

    // --- IAU WGSN Named Stars ---
    // Download the official IAU Catalog of Star Names (IAU-CSN), the
    // authoritative list of ~450 WGSN-approved proper names (Sirius, Vega,
    // Schedar, ...). Each row carries the name plus accurate J2000 coords and
    // HD/HIP ids, so entries are stored as catalog='Named' and the merge step
    // shadows the matching anonymous HD/HIP star with the proper name.
    //
    // This replaces the old SIMBAD `NAME %` query, which silently missed many
    // famous stars (their WGSN name is not surfaced under the `NAME ` prefix).
    console.log("Downloading IAU Catalog of Star Names (IAU-CSN)...");
    let namedStarCount = 0;
    try {
      const csnRes = await axiosGetWithRetry(
        "https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt",
        { responseType: "text", timeout: 60000 },
      );
      const csnLines = csnRes.data
        .split("\n")
        // Drop comment (`#`), citation (`$`), and blank lines; data rows start
        // with the ASCII name.
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("$") && l.trim());

      db.transaction(() => {
        clearCatalogs(db, ["Named"]);
        for (const line of csnLines) {
          // Whitespace-delimited fixed-ish columns. Anchor on the YYYY-MM-DD
          // "Date" column: RA/Dec are the two tokens before it, HD/HIP the two
          // before that, and the ASCII name is the first token. This is robust
          // against the variable-width Bayer/constellation columns in between.
          const cols = line.trim().split(/\s+/);
          const dateIdx = cols.findIndex((t) => /^\d{4}-\d{2}-\d{2}$/.test(t));
          if (dateIdx < 4) continue;
          const ra = parseFloat(cols[dateIdx - 2]);
          const dec = parseFloat(cols[dateIdx - 1]);
          if (isNaN(ra) || isNaN(dec)) continue;
          const name = cols[0];
          if (!name || name === "_") continue;
          // Columns before Date are: ... mag bnd HIP HD RA Dec Date, so the
          // magnitude is six tokens before the date anchor.
          const magRaw = parseFloat(cols[dateIdx - 6]);
          const mag = isNaN(magRaw) ? null : magRaw;
          insert.run("Named", name, name, name, "Star", ra, dec, mag, null);
          namedStarCount++;
        }
      })();
      console.log(`IAU-CSN named stars seeded: ${namedStarCount} stars.`);
    } catch (err) {
      // IAU-CSN is a static file fetched with retry; if it is unreachable we
      // skip named-star labels for this run rather than carrying a stale
      // hardcoded copy. HD/Gaia stars still render (just without a proper name).
      console.warn("IAU-CSN download failed (skipping named stars):", err.message);
    }

    // Keep well-known DSO common names that solve.js won't get from OpenNGC
    const specialDSOs = [
      [
        "Neb",
        "Horsehead",
        "IC 434",
        "Horsehead Nebula",
        "Neb",
        85.2435,
        -2.458,
        7.3,
        8.0,
      ],
      [
        "Neb",
        "Flame",
        "NGC 2024",
        "Flame Nebula",
        "Neb",
        85.43,
        -1.86,
        10.0,
        30.0,
      ],
    ];
    db.transaction(() => {
      clearCatalogs(db, ["Neb"]);
      for (const dso of specialDSOs) insert.run(...dso);
    })();

      // Mark the inline-originals group complete ONLY if every catalog it owns
      // actually has rows. If any seeded 0 (e.g. a bad VizieR table id or a
      // transient failure), leave it unrecorded so a plain re-run retries the
      // whole group — no --rebuild needed. The group is small/fast, so redoing
      // all of it to recover one empty catalog is cheap.
      const perTag = db
        .prepare(
          `SELECT catalog, COUNT(*) n FROM objects WHERE catalog IN (${INLINE_LOADER_TAGS.map(() => "?").join(",")}) GROUP BY catalog`,
        )
        .all(...INLINE_LOADER_TAGS);
      const counts = new Map(perTag.map((r) => [r.catalog, r.n]));
      const emptyTags = INLINE_REQUIRED_TAGS.filter((t) => !(counts.get(t) > 0));
      const inlineRows = perTag.reduce((sum, r) => sum + r.n, 0);
      if (emptyTags.length === 0) {
        markLoaded(db, "inline_originals", inlineRows);
      } else {
        console.warn(
          `Inline originals NOT marked complete — empty catalogs will retry next run: ${emptyTags.join(", ")}`,
        );
      }
    } // end inline-originals group

    // --- Deep-sky-object bundle (galaxies, quasars, faint nebulae, clusters) ---
    // Each is skip-guarded: a re-run skips ones already loaded and retries any
    // that previously yielded 0 rows (e.g. a bad table id now fixed).
    await runStep(db, "hyperleda", ["PGC"], () => seedHyperLeda(db, insert));
    await runStep(db, "milliquas", ["MILLIQUAS"], () => seedMilliquas(db, insert));
    for (const src of NEBULA_SOURCES) {
      const [key, , , , , catalog] = src;
      await runStep(db, key, [catalog], () => seedNebulaSource(db, insert, src));
    }
    await runStep(db, "clusters", ["OCL"], () => seedClusters(db, insert));

    // --- Gaia DR3 G≤15 stars (~37M) ---
    // Gaia tracks completed tiles itself, so it resumes a partial sweep rather
    // than restarting; no runStep wrapper needed.
    await seedGaia(db, insert);

    // Spatial index over point positions, so the runtime DAO can prefilter a
    // cone with the R-tree instead of scanning the full table — essential at
    // ~38M rows. Point objects use a degenerate box (min==max) per axis.
    buildRtreeIndex(db);

    const count = db
      .prepare("SELECT COUNT(*) as count FROM objects")
      .get().count;
    console.log(`Database Ready. Total Objects: ${count}`);
  } catch (err) {
    console.error("Seeding failed:", err.stack);
  } finally {
    db.close();
  }
}

/**
 * (Re)builds the R-tree spatial index over object positions.
 *
 * The build is **atomic and verified**: the DROP + CREATE + bulk INSERT run in
 * a single transaction, so an interrupted run rolls back and leaves the prior
 * index intact rather than a half-filled, ID-mismatched one. After building it
 * confirms the R-tree row count equals the number of objects with coordinates;
 * only then is it skippable on the next run. If a prior run left a stale index
 * (row counts disagree), it is rebuilt.
 *
 * @param {import('better-sqlite3').Database} db
 */
function buildRtreeIndex(db) {
  const objectsWithCoords = db
    .prepare("SELECT COUNT(*) n FROM objects WHERE ra IS NOT NULL AND dec IS NOT NULL")
    .get().n;

  const hasRtree = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='objects_rtree'")
    .get();
  if (hasRtree && !REBUILD) {
    const rtreeRows = db.prepare("SELECT COUNT(*) n FROM objects_rtree").get().n;
    if (rtreeRows === objectsWithCoords) {
      console.log(`✓ R-tree already built (${rtreeRows} rows) — skipping.`);
      return;
    }
    console.log(
      `R-tree stale (${rtreeRows} rows vs ${objectsWithCoords} objects) — rebuilding.`,
    );
  }

  console.log(`Building R-tree spatial index over ${objectsWithCoords} objects...`);
  const build = db.transaction(() => {
    db.exec("DROP TABLE IF EXISTS objects_rtree");
    db.exec(
      "CREATE VIRTUAL TABLE objects_rtree USING rtree(id, minRA, maxRA, minDec, maxDec)",
    );
    db.exec(`
      INSERT INTO objects_rtree (id, minRA, maxRA, minDec, maxDec)
        SELECT id, ra, ra, dec, dec FROM objects WHERE ra IS NOT NULL AND dec IS NOT NULL
    `);
  });
  build();

  const built = db.prepare("SELECT COUNT(*) n FROM objects_rtree").get().n;
  if (built !== objectsWithCoords) {
    throw new Error(
      `R-tree build mismatch: ${built} index rows vs ${objectsWithCoords} objects`,
    );
  }
  console.log(`R-tree spatial index built (${built} rows).`);
}

/**
 * HyperLEDA / PGC galaxies. Brings deep galaxies far beyond the OpenNGC set.
 * Normalised to catalog='PGC', type='G'. VizieR source: VII/237 (HYPERLEDA).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {import('better-sqlite3').Statement} insert
 * @returns {Promise<number>} Rows inserted (0 on failure, so the step retries)
 */
async function seedHyperLeda(db, insert) {
  console.log("Downloading HyperLEDA galaxies (PGC) from VizieR...");
  try {
    const lines = await fetchVizierTsv(
      "VII/237/pgc",
      "_RAJ2000,_DEJ2000,PGC,logD25",
      4000000,
    );
    let n = 0;
    const run = db.transaction(() => {
      for (const line of lines) {
        const c = line.split("\t").map((x) => x.trim());
        if (c.length < 3) continue;
        const ra = parseFloat(c[0]);
        const dec = parseFloat(c[1]);
        const pgc = c[2];
        if (isNaN(ra) || isNaN(dec) || !pgc) continue;
        // logD25 is log10 of the apparent diameter in 0.1-arcmin units.
        const logD25 = parseFloat(c[3]);
        const sizeArcmin = isNaN(logD25) ? null : Math.pow(10, logD25) / 10;
        insert.run("PGC", `PGC ${pgc}`, `PGC ${pgc}`, null, "G", ra, dec, null, sizeArcmin);
        n++;
      }
    });
    run();
    console.log(`HyperLEDA galaxies seeded: ${n}.`);
    return n;
  } catch (err) {
    console.warn("HyperLEDA download failed (skipping):", err.message);
    return 0;
  }
}

/**
 * Milliquas (Million Quasars) catalogue. Normalised to catalog='MILLIQUAS',
 * type='QSO'. VizieR source: VII/294 (Flesch).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {import('better-sqlite3').Statement} insert
 * @returns {Promise<number>} Rows inserted (0 on failure, so the step retries)
 */
async function seedMilliquas(db, insert) {
  console.log("Downloading Milliquas quasars from VizieR...");
  try {
    const lines = await fetchVizierTsv(
      "VII/294/catalog",
      "_RAJ2000,_DEJ2000,Name,Rmag",
      4000000,
    );
    let n = 0;
    const run = db.transaction(() => {
      for (const line of lines) {
        const c = line.split("\t").map((x) => x.trim());
        if (c.length < 3) continue;
        const ra = parseFloat(c[0]);
        const dec = parseFloat(c[1]);
        const name = c[2];
        if (isNaN(ra) || isNaN(dec) || !name) continue;
        const rmag = parseFloat(c[3]);
        insert.run(
          "MILLIQUAS",
          name,
          name,
          null,
          "QSO",
          ra,
          dec,
          isNaN(rmag) ? null : rmag,
          null,
        );
        n++;
      }
    });
    run();
    console.log(`Milliquas quasars seeded: ${n}.`);
    return n;
  } catch (err) {
    console.warn("Milliquas download failed (skipping):", err.message);
    return 0;
  }
}

/**
 * The faint-nebula sources, each loaded as its own resumable step so a bad
 * table id (e.g. LBN) can be fixed and retried without re-fetching the others.
 * Fields: [progress key, label, VizieR source, id column, type code, catalog tag, name prefix].
 */
const NEBULA_SOURCES = [
  // LBN's identifier column is `Seq` (verified against VizieR VII/9B); the
  // table has no column literally named "LBN".
  ["nebula_lbn", "LBN bright nebulae", "VII/9B/catalog", "Seq", "RNe", "LBN", "LBN"],
  ["nebula_ldn", "LDN dark nebulae", "VII/7A/ldn", "LDN", "DNe", "LDN", "LDN"],
  ["nebula_barnard", "Barnard dark nebulae", "VII/220A/barnard", "Barn", "DNe", "Barnard", "B"],
];

/**
 * Loads a single faint-nebula VizieR table. Normalised to its catalog tag with
 * a SIMBAD-style type code the classifier understands (RNe / DNe).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {import('better-sqlite3').Statement} insert
 * @param {[string,string,string,string,string,string,string]} source - NEBULA_SOURCES entry
 * @returns {Promise<number>} Rows inserted (0 on failure, so the step retries)
 */
async function seedNebulaSource(db, insert, source) {
  const [, label, vizierId, idCol, typeCode, catalog, prefix] = source;
  console.log(`Downloading ${label} from VizieR...`);
  try {
    const lines = await fetchVizierTsv(
      vizierId,
      `_RAJ2000,_DEJ2000,${idCol}`,
      99999,
    );
    let n = 0;
    const run = db.transaction(() => {
      for (const line of lines) {
        const c = line.split("\t").map((x) => x.trim());
        if (c.length < 3) continue;
        const ra = parseFloat(c[0]);
        const dec = parseFloat(c[1]);
        const id = c[2];
        if (isNaN(ra) || isNaN(dec) || !id) continue;
        const name = `${prefix} ${id}`;
        insert.run(catalog, name, name, null, typeCode, ra, dec, null, null);
        n++;
      }
    });
    run();
    console.log(`${label} seeded: ${n}.`);
    return n;
  } catch (err) {
    console.warn(`${label} download failed (skipping):`, err.message);
    return 0;
  }
}

/**
 * Open clusters from the Melotte, Collinder, and Trumpler catalogues, via the
 * MWSC (Kharchenko) master list on VizieR. Normalised to catalog='OCL',
 * type='OpC'. VizieR source: J/A+A/558/A53 (MWSC).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {import('better-sqlite3').Statement} insert
 * @returns {Promise<number>} Rows inserted (0 on failure, so the step retries)
 */
async function seedClusters(db, insert) {
  console.log("Downloading open clusters from MWSC (Kharchenko)...");
  try {
    const lines = await fetchVizierTsv(
      "J/A+A/558/A53/catalog",
      "_RAJ2000,_DEJ2000,Name,r2",
      99999,
    );
    let n = 0;
    const run = db.transaction(() => {
      for (const line of lines) {
        const c = line.split("\t").map((x) => x.trim());
        if (c.length < 3) continue;
        const ra = parseFloat(c[0]);
        const dec = parseFloat(c[1]);
        // MWSC's Name is the cluster's common designation (NGC/IC/Mel/Cr/Tr/…).
        // MWSC is wholly an open-cluster catalogue, so keep every entry rather
        // than filtering by name prefix (the previous regex dropped all ~3000
        // rows because most are named "NGC ...", not "Melotte ...").
        // MWSC names use underscores (e.g. "NGC_7801", "Berkeley_58"); restore
        // spaces so they read naturally and match the rest of the catalog.
        const name = c[2] ? c[2].replace(/_/g, " ") : null;
        if (isNaN(ra) || isNaN(dec) || !name) continue;
        // r2 is the cluster angular radius in degrees; convert to diameter in arcmin.
        const r2 = parseFloat(c[3]);
        const sizeArcmin = isNaN(r2) ? null : r2 * 2 * 60;
        insert.run("OCL", name, name, null, "OpC", ra, dec, null, sizeArcmin);
        n++;
      }
    });
    run();
    console.log(`Open clusters seeded: ${n}.`);
    return n;
  } catch (err) {
    console.warn("Open clusters download failed (skipping):", err.message);
    return 0;
  }
}

/**
 * Gaia DR3 stars down to G≤15 (~90M rows). A single TAP sync request cannot
 * return the whole set, so the sky is split into RA/Dec tiles. Tiles are
 * *fetched* concurrently (a bounded pool — the long pole is ESA's per-query
 * latency, not bandwidth, so parallelism turns hours into tens of minutes),
 * while *inserts* run on the main thread as each fetch resolves (better-sqlite3
 * is synchronous and SQLite serialises writes anyway). A tile that keeps
 * failing is logged and skipped so one bad tile cannot abort the build.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {import('better-sqlite3').Statement} insert
 */
async function seedGaia(db, insert) {
  const allTiles = buildGaiaTiles();

  // Resume: skip tiles already recorded complete in gaia_tiles (unless
  // --rebuild, which drops that table up front). A tile's rows and its
  // completion record are written in the same transaction, so a recorded
  // tile is guaranteed fully inserted.
  const doneKeys = new Set(
    db.prepare("SELECT tile_key FROM gaia_tiles").all().map((r) => r.tile_key),
  );
  const tiles = allTiles.filter((t) => !doneKeys.has(gaiaTileKey(t)));

  if (tiles.length === 0) {
    console.log(`✓ Gaia already loaded (${allTiles.length} tiles) — skipping.`);
    return;
  }
  console.log(
    `Downloading Gaia DR3 G≤${GAIA_MAG_LIMIT}: ${tiles.length} of ${allTiles.length} tiles ` +
      `remaining (${GAIA_TILE_DEG}°, ${GAIA_FETCH_CONCURRENCY} concurrent` +
      `${doneKeys.size > 0 ? `, ${doneKeys.size} already done` : ""})...`,
  );

  let total = 0;
  let tilesOk = 0;
  let tilesFailed = 0;
  let tilesDone = 0;
  let next = 0;

  // Worker pulls the next tile index, fetches it (with retry), then inserts.
  // Inserts are synchronous so they never interleave mid-transaction.
  async function worker() {
    while (next < tiles.length) {
      const tile = tiles[next++];
      try {
        const lines = await fetchGaiaTileWithRetry(tile);
        total += insertGaiaLines(db, insert, lines, gaiaTileKey(tile));
        tilesOk++;
      } catch (err) {
        tilesFailed++;
        console.warn(
          `Gaia tile RA[${tile.raLo},${tile.raHi}) Dec[${tile.decLo},${tile.decHi}) ` +
            `failed after ${GAIA_TILE_MAX_ATTEMPTS} attempts (skipping): ${err.message}`,
        );
      }
      tilesDone++;
      if (tilesDone % 25 === 0 || tilesDone === tiles.length) {
        console.log(
          `Gaia progress: ${tilesDone}/${tiles.length} tiles — ${total} stars ` +
            `(${tilesFailed} skipped).`,
        );
      }
    }
  }

  const pool = Array.from(
    { length: Math.min(GAIA_FETCH_CONCURRENCY, tiles.length) },
    () => worker(),
  );
  await Promise.all(pool);

  console.log(
    `Gaia DR3 seeded this run: ${total} stars across ${tilesOk} tiles (${tilesFailed} skipped/failed).`,
  );
}

/**
 * Stable progress key for a Gaia tile.
 *
 * @param {{raLo:number,raHi:number,decLo:number,decHi:number}} tile
 * @returns {string}
 */
function gaiaTileKey({ raLo, raHi, decLo, decHi }) {
  return `${raLo}_${raHi}_${decLo}_${decHi}`;
}

/**
 * Enumerates the RA/Dec tiles covering the whole sky. RA is half-open
 * [raLo, raHi) so adjacent tiles do not double-count border stars.
 *
 * @returns {Array<{raLo:number,raHi:number,decLo:number,decHi:number}>}
 */
function buildGaiaTiles() {
  const tiles = [];
  for (let decLo = -90; decLo < 90; decLo += GAIA_TILE_DEG) {
    const decHi = Math.min(90, decLo + GAIA_TILE_DEG);
    for (let raLo = 0; raLo < 360; raLo += GAIA_TILE_DEG) {
      const raHi = Math.min(360, raLo + GAIA_TILE_DEG);
      tiles.push({ raLo, raHi, decLo, decHi });
    }
  }
  return tiles;
}

/**
 * Fetches one Gaia tile from the ESA TAP service, retrying transient failures
 * with linear backoff before giving up.
 *
 * @param {{raLo:number,raHi:number,decLo:number,decHi:number}} tile
 * @returns {Promise<string[]>} Non-comment TSV data lines
 */
async function fetchGaiaTileWithRetry(tile) {
  const { raLo, raHi, decLo, decHi } = tile;
  const adql = [
    "SELECT source_id, ra, dec, phot_g_mean_mag",
    "FROM gaiadr3.gaia_source",
    `WHERE phot_g_mean_mag <= ${GAIA_MAG_LIMIT}`,
    `AND ra >= ${raLo} AND ra < ${raHi}`,
    `AND dec >= ${decLo} AND dec < ${decHi}`,
  ].join(" ");

  let lastErr;
  for (let attempt = 1; attempt <= GAIA_TILE_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await axios.get(GAIA_TAP_URL, {
        params: {
          REQUEST: "doQuery",
          LANG: "ADQL",
          FORMAT: "tsv",
          QUERY: adql,
        },
        responseType: "text",
        timeout: 300000,
      });
      return res.data
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.trim());
    } catch (err) {
      lastErr = err;
      if (attempt < GAIA_TILE_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }
  }
  throw lastErr;
}

/**
 * Inserts parsed Gaia TSV lines into the objects table AND records the tile as
 * complete in gaia_tiles — both in a single transaction, so a tile is never
 * marked done unless its rows committed (and vice versa). Synchronous
 * (better-sqlite3) — callers must not run two of these concurrently.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {import('better-sqlite3').Statement} insert
 * @param {string[]} lines - Non-comment TSV data lines
 * @param {string} tileKey - Stable key recorded so the tile is skipped on re-run
 * @returns {number} Number of stars inserted
 */
function insertGaiaLines(db, insert, lines, tileKey) {
  const markTile = db.prepare(
    `INSERT INTO gaia_tiles (tile_key, rows, completed_at)
       VALUES (?, ?, datetime('now'))
     ON CONFLICT(tile_key) DO UPDATE SET rows = excluded.rows, completed_at = excluded.completed_at`,
  );
  let n = 0;
  const run = db.transaction(() => {
    for (const line of lines) {
      const c = line.split("\t").map((x) => x.trim());
      if (c.length < 4) continue;
      const sourceId = c[0];
      const ra = parseFloat(c[1]);
      const dec = parseFloat(c[2]);
      const mag = parseFloat(c[3]);
      // Skip the header row (non-numeric ra) and malformed rows.
      if (!sourceId || isNaN(ra) || isNaN(dec)) continue;
      const name = `Gaia DR3 ${sourceId}`;
      insert.run("Gaia", name, name, null, "Star", ra, dec, isNaN(mag) ? null : mag, null);
      n++;
    }
    markTile.run(tileKey, n);
  });
  run();
  return n;
}

seed();
