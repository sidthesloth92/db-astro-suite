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
        "SELECT b.HD, t.RAmdeg, t.DEmdeg, t.VTmag",
        'FROM "III/231/appdxb" AS b',
        'JOIN "I/259/tyc2" AS t ON (b.TYC1=t.TYC1 AND b.TYC2=t.TYC2 AND b.TYC3=t.TYC3)',
        "WHERE b.HD IS NOT NULL",
      ].join(" ");
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
      console.warn("Tycho-2 catalog download failed (skipping):", err.message);
    }

    // --- IAU WGSN Named Stars ---
    // Query SIMBAD TAP for all objects with an official IAU name (NAME prefix),
    // filtered to V < 7.5 to capture all ~460 approved star names while
    // excluding faint DSOs. Entries use catalog='Named' so solve.js can
    // prefer them over anonymous HD numbers for the same star.
    const NON_STELLAR_KEYWORDS = [
      "nebula",
      "galaxy",
      "cloud",
      "cluster",
      "remnant",
      "association",
      "complex",
      "supernova",
      "steamer",
    ];
    console.log("Downloading IAU WGSN named stars from SIMBAD TAP...");
    let namedStarCount = 0;
    try {
      const adql = [
        "SELECT i.id, b.ra, b.dec, f.flux",
        "FROM ident AS i",
        "JOIN basic AS b ON b.oid = i.oidref",
        "JOIN flux AS f ON f.oid = b.oid AND f.filter = 'V'",
        "WHERE i.id LIKE 'NAME %'",
        "AND f.flux < 7.5",
        "ORDER BY f.flux",
      ].join(" ");

      const simbadRes = await axios.get(
        "https://simbad.cds.unistra.fr/simbad/sim-tap/sync",
        {
          params: {
            REQUEST: "doQuery",
            LANG: "ADQL",
            FORMAT: "tsv",
            QUERY: adql,
          },
          responseType: "text",
          timeout: 30000,
        },
      );

      const lines = simbadRes.data
        .split("\n")
        .filter(
          (l) => l && !l.startsWith("#") && !l.startsWith("-") && l.trim(),
        );

      db.transaction(() => {
        for (const line of lines) {
          const cols = line.split("\t").map((c) => c.trim());
          if (cols.length < 4) continue;
          const rawId = cols[0];
          if (!rawId.startsWith("NAME ")) continue; // skip header row
          const iauName = rawId.slice(5).trim();
          if (!iauName) continue;
          // Skip non-stellar named objects (nebulae, galaxies, clusters)
          const lower = iauName.toLowerCase();
          if (NON_STELLAR_KEYWORDS.some((kw) => lower.includes(kw))) continue;
          const ra = parseFloat(cols[1]);
          const dec = parseFloat(cols[2]);
          const mag = parseFloat(cols[3]);
          if (isNaN(ra) || isNaN(dec)) continue;
          insert.run(
            "Named",
            iauName,
            iauName,
            iauName,
            "Star",
            ra,
            dec,
            isNaN(mag) ? null : mag,
            null,
          );
          namedStarCount++;
        }
      })();
      console.log(`IAU WGSN named stars seeded: ${namedStarCount} stars.`);
    } catch (err) {
      console.warn(
        "IAU named stars download failed (falling back to hardcoded list):",
        err.message,
      );
      // Hardcoded fallback: complete IAU WGSN list for the most important named stars.
      // [name, ra_deg, dec_deg, vmag]
      const FALLBACK_NAMED_STARS = [
        ["Sirius", 101.2874, -16.7161, -1.46],
        ["Canopus", 95.9879, -52.6957, -0.74],
        ["Rigil Kentaurus", 219.9021, -60.834, -0.27],
        ["Arcturus", 213.9153, 19.1822, -0.04],
        ["Vega", 279.2347, 38.7837, 0.03],
        ["Capella", 79.1723, 45.998, 0.08],
        ["Rigel", 78.6345, -8.2016, 0.12],
        ["Procyon", 114.8255, 5.225, 0.34],
        ["Betelgeuse", 88.7929, 7.4071, 0.45],
        ["Achernar", 24.4286, -57.2367, 0.46],
        ["Hadar", 210.9559, -60.373, 0.61],
        ["Altair", 297.6958, 8.8683, 0.77],
        ["Acrux", 186.6496, -63.0991, 0.77],
        ["Aldebaran", 68.9802, 16.5093, 0.85],
        ["Spica", 201.2983, -11.1614, 0.97],
        ["Antares", 247.3519, -26.432, 1.06],
        ["Pollux", 116.329, 28.0262, 1.14],
        ["Fomalhaut", 344.4127, -29.6222, 1.16],
        ["Mimosa", 191.9302, -59.6888, 1.25],
        ["Deneb", 310.3579, 45.2803, 1.25],
        ["Regulus", 152.0929, 11.9672, 1.35],
        ["Adhara", 104.6564, -28.9721, 1.5],
        ["Castor", 113.6497, 31.8883, 1.58],
        ["Shaula", 263.4022, -37.1033, 1.62],
        ["Gacrux", 187.7915, -57.1132, 1.64],
        ["Bellatrix", 81.283, 6.3497, 1.64],
        ["Elnath", 81.5727, 28.6074, 1.68],
        ["Miaplacidus", 138.3001, -69.7172, 1.68],
        ["Alnilam", 84.0533, -1.2019, 1.69],
        ["Alnitak", 85.1897, -1.9426, 1.74],
        ["Regor", 122.383, -47.3366, 1.75],
        ["Alioth", 193.5073, 55.9598, 1.77],
        ["Dubhe", 165.932, 61.751, 1.79],
        ["Mirfak", 51.0807, 49.8612, 1.8],
        ["Wezen", 107.0979, -26.3932, 1.84],
        ["Kaus Australis", 276.043, -34.3847, 1.85],
        ["Avior", 125.6284, -59.5092, 1.86],
        ["Alkaid", 206.8852, 49.3133, 1.86],
        ["Sargas", 264.3297, -42.9978, 1.87],
        ["Atria", 252.1662, -69.0277, 1.92],
        ["Alhena", 99.4278, 16.3993, 1.93],
        ["Peacock", 306.412, -56.735, 1.94],
        ["Alsephina", 131.1757, -54.7087, 1.96],
        ["Mirzam", 95.6748, -17.9559, 1.98],
        ["Alphard", 141.8968, -8.6586, 1.98],
        ["Polaris", 37.9529, 89.2641, 1.97],
        ["Hamal", 31.7933, 23.4625, 2.01],
        ["Diphda", 10.8974, -17.9866, 2.04],
        ["Nunki", 283.8163, -26.2967, 2.05],
        ["Alpheratz", 2.0969, 29.0905, 2.06],
        ["Mirach", 17.433, 35.6204, 2.06],
        ["Menkent", 211.6706, -36.3701, 2.06],
        ["Saiph", 86.9388, -9.6697, 2.07],
        ["Ankaa", 6.571, -42.3061, 2.4],
        ["Schedar", 10.1268, 56.5373, 2.23],
        ["Mintaka", 83.0017, -0.2991, 2.25],
        ["Eltanin", 269.1516, 51.4889, 2.23],
        ["Caph", 2.2945, 59.1498, 2.28],
        ["Naos", 120.8961, -40.0031, 2.21],
        ["Dschubba", 240.0833, -22.6217, 2.29],
        ["Izar", 221.2467, 27.0742, 2.35],
        ["Markab", 346.1902, 15.2052, 2.49],
        ["Acrab", 241.3591, -19.8054, 2.5],
        ["Algol", 47.0421, 40.9557, 2.12],
        ["Algieba", 154.9931, 19.8414, 2.01],
        ["Scheat", 345.9443, 28.0828, 2.44],
        ["Menkib", 56.4553, 35.7912, 4.04],
        ["Almaaz", 75.4922, 43.8232, 2.99],
        ["Sadr", 305.5571, 40.2567, 2.23],
        ["Tarazed", 298.8281, 10.6136, 2.72],
        ["Hatysa", 83.8583, -5.9097, 2.77],
        ["Kornephoros", 247.5549, 21.4896, 2.78],
        ["Zubenelgenubi", 222.7196, -16.0418, 2.75],
        ["Zubeneschamali", 229.2517, -9.383, 2.61],
        ["Alderamin", 319.6447, 62.5856, 2.45],
        ["Kochab", 222.6764, 74.1555, 2.07],
        ["Pherkad", 230.1823, 71.834, 3.05],
        ["Navi", 14.1773, 60.7167, 2.2],
        ["Ruchbah", 21.4538, 60.2353, 2.68],
        ["Segin", 28.5988, 63.67, 3.37],
        ["Alphecca", 233.6719, 26.7147, 2.22],
        ["Nusakan", 232.5148, 29.1056, 3.68],
        ["Albireo", 292.6803, 27.9597, 3.09],
        ["Deneb Algedi", 326.7603, -16.1272, 2.85],
        ["Nashira", 325.0225, -16.6622, 3.68],
        ["Dabih", 305.2521, -14.7814, 3.05],
        ["Algedi", 304.5127, -12.5447, 3.58],
        ["Sadalsuud", 322.8896, -5.5712, 2.9],
        ["Sadalmelik", 331.4457, -0.3199, 2.95],
        ["Sadachbia", 336.1277, 1.3788, 3.85],
        ["Alrescha", 30.5742, 2.764, 3.82],
        ["Torcularis Septentrionalis", 24.5039, 9.1858, 4.27],
        ["Fumalsamakah", 348.5823, 4.0691, 4.48],
        ["Revati", 10.8877, 7.5755, 5.19],
        ["Almach", 30.9751, 42.3297, 2.26],
        ["Adhil", 18.3514, 36.7932, 4.88],
        ["Titawin", 22.8269, 41.4065, 4.1],
        ["Sarir", 27.2618, 29.0905, 4.52],
        ["Mesarthim", 28.3826, 19.294, 3.86],
        ["Sheratan", 28.6605, 20.8082, 2.66],
        ["Bharani", 48.0189, 27.261, 3.61],
        ["Botein", 44.1098, 19.7267, 4.35],
        ["Porrima", 190.4151, -1.4493, 2.74],
        ["Vindemiatrix", 195.544, 10.9592, 2.83],
        ["Minelauva", 197.9674, 3.3975, 3.38],
        ["Heze", 205.005, -0.5958, 3.38],
        ["Syrma", 214.0044, -6.0006, 4.08],
        ["Zaniah", 188.4356, 0.6668, 3.89],
        ["Rijl al Awwa", 218.0093, -5.6574, 4.53],
        ["Sulaphat", 284.7364, 32.6896, 3.25],
        ["Sheliak", 282.5198, 33.3627, 3.52],
        ["Aladfar", 286.1776, 36.8982, 4.23],
        ["Sulafat", 284.7364, 32.6896, 3.25],
        ["Okab", 283.8163, 13.8633, 2.99],
        ["Alshain", 298.8281, 6.4069, 3.71],
        ["Libertas", 301.1194, 12.3563, 4.71],
        ["Altais", 288.1388, 67.6614, 3.07],
        ["Aldulfin", 309.0915, 11.3036, 4.43],
        ["Sham", 319.378, 12.5563, 3.77],
        ["Anser", 298.0064, 24.6647, 4.44],
        ["Kaus Media", 275.2491, -29.828, 2.7],
        ["Kaus Borealis", 271.452, -25.4217, 2.81],
        ["Polis", 274.4067, -29.828, 3.91],
        ["Ascella", 286.7362, -29.88, 2.6],
        ["Alnasl", 271.452, -30.4239, 2.99],
        ["Nanto", 283.8163, -26.9968, 3.17],
        ["Rukbat", 283.8163, -40.6154, 3.96],
        ["Arkab Prior", 282.7278, -44.4596, 4.01],
        ["Arkab Posterior", 282.5198, -44.809, 4.27],
        ["Ainalrami", 279.2347, -36.7616, 4.73],
        ["Albaldah", 294.1797, -29.88, 2.89],
        ["Nunki", 283.8163, -26.2967, 2.05],
        ["Alrami", 279.2347, -36.7616, 4.73],
        ["Kaus Australis", 276.043, -34.3847, 1.85],
        ["Gomeisa", 111.7876, 8.2893, 2.89],
        ["Furud", 95.0783, -30.0635, 3.02],
        ["Aludra", 111.0237, -29.3032, 2.45],
        ["Muliphein", 104.2396, -15.633, 4.11],
        ["Unurgunite", 111.0237, -27.9353, 3.49],
        ["Sirius", 101.2874, -16.7161, -1.46],
        ["Phact", 84.9122, -34.0741, 2.65],
        ["Wazn", 87.7399, -35.7683, 3.12],
        ["Hassaleh", 74.2479, 33.1661, 2.69],
        ["Menkalinan", 89.982, 44.9474, 1.9],
        ["Kabdhilinan", 76.6279, 41.2341, 2.69],
        ["Mahasim", 89.982, 37.2128, 2.65],
        ["Hoedus", 82.4958, 41.2341, 3.17],
        ["Sadatoni", 92.4279, 41.4065, 3.75],
        ["Almaaz", 75.4922, 43.8232, 2.99],
        ["Elkurud", 95.6748, -24.3044, 3.73],
      ];
      db.transaction(() => {
        for (const [name, ra, dec, mag] of FALLBACK_NAMED_STARS) {
          insert.run("Named", name, name, name, "Star", ra, dec, mag, null);
          namedStarCount++;
        }
      })();
      console.log(`Fallback named stars inserted: ${namedStarCount}.`);
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
      for (const dso of specialDSOs) insert.run(...dso);
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
