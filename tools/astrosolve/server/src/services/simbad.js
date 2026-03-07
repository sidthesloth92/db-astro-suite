import axios from 'axios';

/**
 * Queries the SIMBAD TAP service to find DSOs within a given radius using an ADQL command.
 * 
 * @param {number} ra - Right Ascension of the image center (degrees)
 * @param {number} dec - Declination of the image center (degrees)
 * @param {number} radiusDeg - Search radius in degrees 
 * @returns {Promise<Array>} List of recognized celestial objects
 */
export async function querySimbad(ra, dec, radiusDeg) {
  // Query for basic data, filtering to Galaxies (G), Quasars (QSO), Planetary Nebulae (PN), HII regions
  // We specify exactly what columns we need: main_id, otype, ra_degree, dec_degree
  const adqlQuery = `
    SELECT basic.MAIN_ID, basic.OTYPE, basic.RA, basic.DEC
    FROM basic
    WHERE CONTAINS(POINT('ICRS', basic.RA, basic.DEC), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1
    AND basic.OTYPE IN ('G', 'QSO', 'PN', 'HII')
  `;

  try {
    const response = await axios.get('http://simbad.u-strasbg.fr/simbad/sim-tap/sync', {
      params: {
        request: 'doQuery',
        lang: 'adql',
        format: 'json',
        query: adqlQuery
      }
    });

    if (response.data && response.data.data) {
      // Map the array of arrays response from TAP JSON into nicely formatted objects
      return response.data.data.map(row => ({
        id: row[0],
        type: row[1],
        ra: row[2],
        dec: row[3]
      }));
    }

    return [];
  } catch (err) {
    console.error("SIMBAD TAP error:", err.message);
    throw new Error("Failed to consult SIMBAD for objects in the solved frame.");
  }
}
