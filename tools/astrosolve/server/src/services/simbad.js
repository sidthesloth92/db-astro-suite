import axios from "axios";

/**
 * Queries the SIMBAD TAP service to find DSOs within a given radius using an ADQL command.
 *
 * @param {number} ra - Right Ascension of the image center (degrees)
 * @param {number} dec - Declination of the image center (degrees)
 * @param {number} radiusDeg - Search radius in degrees
 * @param {number} minMagnitude - Brightest magnitude constraint (lower is brighter)
 * @returns {Promise<Array>} List of recognized celestial objects
 */
export async function querySimbad(ra, dec, radiusDeg, minMagnitude = 13.5) {
  // Query for basic data, filtering to Galaxies (G), Quasars (QSO), Planetary Nebulae (PN), HII regions, and Stars
  // We use TOP 400 to ensure a rich star field without overwhelming the UI
  const adqlQuery = `
    SELECT TOP 500 basic.MAIN_ID, basic.OTYPE, basic.RA, basic.DEC, basic.FLUX_V
    FROM basic
    WHERE CONTAINS(POINT('ICRS', basic.RA, basic.DEC), CIRCLE('ICRS', ${ra}, ${dec}, ${radiusDeg})) = 1
    AND basic.OTYPE IN (
      '*', '**', 'V*', 'Ce*', 'RR*', 'LP*', 'Mi*', 'WR*', 'C*', 'Be*', 'HB*', 'WD*', 'No*', 'SN*',
      'G', 'GiP', 'GiG', 'GiC', 'BClG', 'Sy1', 'Sy2', 'Sy*', 'AGN', 'LINER', 'EmG',
      'QSO', 'Bla',
      'OpC', 'GlC', 'Cl*', 'As*',
      'PN',
      'HII', 'RNe', 'MoC', 'DNe', 'SNR', 'EmO', 'bub',
      'ClG'
    )
    AND (basic.FLUX_V <= ${minMagnitude} OR basic.FLUX_V IS NULL)
    ORDER BY basic.FLUX_V ASC
  `;

  try {
    const response = await axios.get(
      "http://simbad.u-strasbg.fr/simbad/sim-tap/sync",
      {
        params: {
          request: "doQuery",
          lang: "adql",
          format: "json",
          query: adqlQuery,
        },
      },
    );

    if (response.data && response.data.data) {
      // Map the array of arrays response from TAP JSON into nicely formatted objects
      return response.data.data.map((row) => ({
        name: row[0],
        type: row[1],
        ra: row[2],
        dec: row[3],
        magnitude: row[4],
        source: "simbad",
      }));
    }

    return [];
  } catch (err) {
    console.error("SIMBAD TAP error:", err.message);
    return [];
  }
}
