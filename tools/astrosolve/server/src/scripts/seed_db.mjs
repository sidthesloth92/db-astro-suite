import sqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/celestial.sqlite');

// URLs for Pro-Grade Catalogs
const OPEN_NGC_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv';

async function seed() {
  console.log('--- Master Seeder: Initializing Galactic Atlas ---');
  
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
      magnitude REAL
    );
    CREATE INDEX idx_coords ON objects (ra, dec);
  `);

  try {
    console.log('Downloading OpenNGC Database (NGC, IC, Messier, Caldwell)...');
    const response = await axios.get(OPEN_NGC_URL);
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';' // OpenNGC uses semicolon
    });

    const insert = db.prepare(`
      INSERT INTO objects (catalog, entryId, name, commonName, type, ra, dec, magnitude) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      // Fix: OpenNGC uses sexagesimal coordinates (05:40:53.3 and -01:29:58)
      // We must translate these to decimal degrees. RA is in Hours (1 hr = 15 deg).
      function parseRA(raStr) {
        if (!raStr) return null;
        const p = raStr.split(':').map(Number);
        if (p.length !== 3) return parseFloat(raStr);
        return (p[0] + p[1]/60 + p[2]/3600) * 15;
      }

      function parseDec(decStr) {
        if (!decStr) return null;
        const p = decStr.split(':').map(Number);
        if (p.length !== 3) return parseFloat(decStr);
        const sign = decStr.trim().startsWith('-') ? -1 : 1;
        const d = Math.abs(p[0]) + p[1]/60 + p[2]/3600;
        return sign * d;
      }

      for (const row of records) {
        // Only import objects with valid coordinates
        if (!row.RA || !row.Dec) continue;

        let catalog = row.Type === 'Star' ? 'Star' : 'NGC/IC';
        const entryId = row.Name;
        const name = row.Name;
        const commonName = row.Common_names || null;
        const type = row.Type;
        const ra = parseRA(row.RA);
        const dec = parseDec(row.Dec);

        const magnitude = parseFloat(row.Mag) || 15;

        insert.run(catalog, entryId, name, commonName, type, ra, dec, magnitude);

        // If it has a Messier cross-reference, add it as a separate Messier record for the UI filter
        if (row.Messier) {
          insert.run('M', `M${row.Messier}`, `M ${row.Messier}`, commonName || name, 'M', ra, dec, magnitude);
        }
      }
    })();

    console.log(`OpenNGC Seeding Complete: ${records.length} objects added.`);

    // Add some "Named Stars" for the Orion region to ensure Horsehead image looks great
    const brightStars = [
      ['Star', 'Alnitak', 'Zeta Ori', 'Alnitak', 'Star', 85.1897, -1.9426, 1.74],
      ['Star', 'Alnilam', 'Epsilon Ori', 'Alnilam', 'Star', 84.0533, -1.2019, 1.69],
      ['Star', 'Mintaka', 'Delta Ori', 'Mintaka', 'Star', 83.0017, -0.2991, 2.25],
      ['Star', 'Rigel', 'Beta Ori', 'Rigel', 'Star', 78.6345, -8.2016, 0.12],
      ['Star', 'Betelgeuse', 'Alpha Ori', 'Betelgeuse', 'Star', 88.7929, 7.4070, 0.45],
      ['Neb', 'Horsehead', 'IC 434', 'Horsehead Nebula', 'Neb', 85.2435, -2.4580, 7.3],
      ['Neb', 'Flame', 'NGC 2024', 'Flame Nebula', 'Neb', 85.43, -1.86, 10.0]
    ];

    db.transaction(() => {
      for (const star of brightStars) {
        insert.run(...star);
      }
    })();

    const count = db.prepare('SELECT COUNT(*) as count FROM objects').get().count;
    console.log(`Database Ready. Total Objects: ${count}`);
    
  } catch (err) {
    console.error('Seeding failed:', err.stack);
  } finally {
    db.close();
  }
}

seed();
