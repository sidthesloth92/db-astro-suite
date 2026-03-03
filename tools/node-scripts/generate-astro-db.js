const https = require('https');
const fs = require('fs');
const path = require('path');

const CSV_URL = 'https://raw.githubusercontent.com/MattiaVerga/OpenNGC/master/NGC.csv';
const DB_PATH = path.join(__dirname, '../astrogram/src/assets/data/objects_db.json');

console.log('Downloading OpenNGC database...');

https.get(CSV_URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Download complete. Parsing data...');
    const objects = {};
    const lines = data.split('\n');
    
    // Header: Name;Type;RA;Dec;Const;MajAx;MinAx;PosAng;B-Mag;V-Mag;J-Mag;H-Mag;K-Mag;SurfBr;Hubble;Cstar;U-Mag;B-V;V-I;V-R...
    const headers = lines[0].split(';');
    const nameIdx = headers.indexOf('Name');
    const typeIdx = headers.indexOf('Type');
    const majAxIdx = headers.indexOf('MajAx');
    const vMagIdx = headers.indexOf('V-Mag');
    const bMagIdx = headers.indexOf('B-Mag');
    const messierIdx = headers.indexOf('M'); // The messier number column

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const cols = lines[i].split(';');
      
      let name = cols[nameIdx]?.trim();
      if (!name) continue;
      
      const type = cols[typeIdx]?.trim() || 'Unknown';
      let objType = 'G'; // Galaxy default
      
      if (type.includes('Star') || type === '* ' || type === '**') objType = 'Star';
      else if (type.includes('PN')) objType = 'PN';
      else if (type.includes('Neb')) objType = 'EN';
      else if (type.includes('Cl')) objType = 'OC'; // Open Cluster or Globular Cluster

      let mag = parseFloat(cols[vMagIdx]);
      if (isNaN(mag)) mag = parseFloat(cols[bMagIdx]);
      if (isNaN(mag)) mag = 10; // Default magnitude fallback
      
      let size = parseFloat(cols[majAxIdx]); // Usually in arcmin
      if (isNaN(size)) size = 5; // Default size 5 arcmin

      // OpenNGC prefix handling
      let formattedName = name;
      if (name.startsWith('NGC')) formattedName = `NGC ${name.substring(3).trim()}`;
      else if (name.startsWith('IC')) formattedName = `IC ${name.substring(2).trim()}`;

      objects[formattedName] = {
        id: formattedName,
        type: objType,
        mag: mag,
        sizeId: size
      };

      // Also map the Messier name if it has one
      const mNum = cols[messierIdx]?.trim();
      if (mNum && parseInt(mNum)) {
        objects[`M${mNum}`] = {
          id: `M${mNum}`,
          type: objType,
          mag: mag,
          sizeId: size
        };
        // Add variations just in case
        objects[`M ${mNum}`] = objects[`M${mNum}`];
      }
    }

    // Add some common named stars manually if they aren't in NGC
    const commonStars = [
      { id: 'Sirius', type: 'Star', mag: -1.46, sizeId: 1 },
      { id: 'Canopus', type: 'Star', mag: -0.74, sizeId: 1 },
      { id: 'Rigil Kentaurus', type: 'Star', mag: -0.27, sizeId: 1 },
      { id: 'Arcturus', type: 'Star', mag: -0.05, sizeId: 1 },
      { id: 'Vega', type: 'Star', mag: 0.03, sizeId: 1 },
      { id: 'Capella', type: 'Star', mag: 0.08, sizeId: 1 },
      { id: 'Rigel', type: 'Star', mag: 0.13, sizeId: 1 },
      { id: 'Procyon', type: 'Star', mag: 0.34, sizeId: 1 },
      { id: 'Achernar', type: 'Star', mag: 0.46, sizeId: 1 },
      { id: 'Betelgeuse', type: 'Star', mag: 0.50, sizeId: 1 },
      { id: 'Hadar', type: 'Star', mag: 0.61, sizeId: 1 },
      { id: 'Altair', type: 'Star', mag: 0.76, sizeId: 1 },
      { id: 'Acrux', type: 'Star', mag: 0.77, sizeId: 1 },
      { id: 'Aldebaran', type: 'Star', mag: 0.85, sizeId: 1 },
      { id: 'Antares', type: 'Star', mag: 0.96, sizeId: 1 },
      { id: 'Spica', type: 'Star', mag: 0.97, sizeId: 1 },
      { id: 'Pollux', type: 'Star', mag: 1.16, sizeId: 1 },
      { id: 'Fomalhaut', type: 'Star', mag: 1.16, sizeId: 1 },
      { id: 'Deneb', type: 'Star', mag: 1.25, sizeId: 1 },
      { id: 'Mimosa', type: 'Star', mag: 1.25, sizeId: 1 },
      { id: 'Regulus', type: 'Star', mag: 1.35, sizeId: 1 },
      { id: 'Adhara', type: 'Star', mag: 1.50, sizeId: 1 },
      { id: 'Shaula', type: 'Star', mag: 1.62, sizeId: 1 },
      { id: 'Castor', type: 'Star', mag: 1.62, sizeId: 1 },
      { id: 'Gacrux', type: 'Star', mag: 1.63, sizeId: 1 },
      { id: 'Bellatrix', type: 'Star', mag: 1.64, sizeId: 1 },
      { id: 'Elnath', type: 'Star', mag: 1.65, sizeId: 1 },
      { id: 'Miaplacidus', type: 'Star', mag: 1.67, sizeId: 1 },
      { id: 'Alnilam', type: 'Star', mag: 1.69, sizeId: 1 },
      { id: 'Polaris', type: 'Star', mag: 1.98, sizeId: 1 },
      { id: 'Alnitak', type: 'Star', mag: 1.77, sizeId: 1 },
      { id: 'Mintaka', type: 'Star', mag: 2.23, sizeId: 1 },
      { id: 'Saiph', type: 'Star', mag: 2.06, sizeId: 1 },
    ];

    for (const star of commonStars) {
      objects[star.id] = star;
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(objects));
    console.log(`Successfully generated ASTROGRAM objects DB at ${DB_PATH} with ${Object.keys(objects).length} entries.`);
  });
}).on('error', (e) => {
  console.error(`Failed to download database: ${e.message}`);
});
