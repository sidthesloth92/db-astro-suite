import sqlite3 from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { parse } from "csv-parse/sync";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../data/celestial.sqlite");

// URLs for Pro-Grade Catalogs
const OPEN_NGC_URL =
  "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv";

async function seed() {
  console.log("--- Master Seeder: Initializing Galactic Atlas ---");

  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = sqlite3(dbPath);

  // Wipe and recreate for fresh master seed
  db.exec(`
    DROP TABLE IF EXISTS objects;
    CREATE TABLE objects (
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
    CREATE INDEX idx_coords ON objects (ra, dec);
  `);

  try {
    console.log("Downloading OpenNGC Database (NGC, IC, Messier, Caldwell)...");
    const response = await axios.get(OPEN_NGC_URL);
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";", // OpenNGC uses semicolon
    });

    const insert = db.prepare(`
      INSERT INTO objects (catalog, entryId, name, commonName, type, ra, dec, magnitude, sizeArcmin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
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
      // VizieR TAP query for Sharpless 1959 catalog (VII/20H)
      const sh2Response = await axios.get(
        "https://vizier.cds.unistra.fr/viz-bin/asu-tsv",
        {
          params: {
            "-source": "VII/20H/sharpless",
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

      const sh2Insert = db.transaction(() => {
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
        }
      });
      sh2Insert();
      console.log("Sharpless Sh2 catalog seeded.");
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

      const acoInsert = db.transaction(() => {
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
        }
      });
      acoInsert();
      console.log("Abell Galaxy Clusters (ACO) seeded.");
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
      const hipResponse = await axios.get(
        "https://vizier.cds.unistra.fr/viz-bin/asu-tsv",
        {
          params: {
            "-source": "I/239/hip_main",
            "-out": "_RAJ2000,_DEJ2000,HD,Vmag",
            "-out.max": "unlimited",
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
        'SELECT b.HD, t.RAmdeg, t.DEmdeg, t.VTmag',
        'FROM "III/231/appdxb" AS b',
        'JOIN "I/259/tyc2" AS t ON (b.TYC1=t.TYC1 AND b.TYC2=t.TYC2 AND b.TYC3=t.TYC3)',
        'WHERE b.HD IS NOT NULL',
      ].join(' ');
      const tycResponse = await axios.get(
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
      console.warn(
        "Tycho-2 catalog download failed (skipping):",
        err.message,
      );
    }

    // Add some "Named Stars" for the Orion region to ensure Horsehead image looks great
    const brightStars = [
      [
        "Star",
        "Alnitak",
        "Zeta Ori",
        "Alnitak",
        "Star",
        85.1897,
        -1.9426,
        1.74,
        null,
      ],
      [
        "Star",
        "Alnilam",
        "Epsilon Ori",
        "Alnilam",
        "Star",
        84.0533,
        -1.2019,
        1.69,
        null,
      ],
      [
        "Star",
        "Mintaka",
        "Delta Ori",
        "Mintaka",
        "Star",
        83.0017,
        -0.2991,
        2.25,
        null,
      ],
      [
        "Star",
        "Rigel",
        "Beta Ori",
        "Rigel",
        "Star",
        78.6345,
        -8.2016,
        0.12,
        null,
      ],
      [
        "Star",
        "Betelgeuse",
        "Alpha Ori",
        "Betelgeuse",
        "Star",
        88.7929,
        7.407,
        0.45,
        null,
      ],
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
      for (const star of brightStars) {
        insert.run(...star);
      }
    })();

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

seed();
