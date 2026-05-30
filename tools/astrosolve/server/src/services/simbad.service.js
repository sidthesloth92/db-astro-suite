import axios from "axios";
import { CatalogObject } from "../models/solve.model.js";
import { CatalogError } from "../models/errors.model.js";
import { tail } from "../utils/diagnostics.util.js";
import { SIMBAD_RESULT_CAP } from "../constants/catalog.constants.js";

const SIMBAD_TAP_URL = "http://simbad.u-strasbg.fr/simbad/sim-tap/sync";

/**
 * Queries the SIMBAD TAP service to find DSOs within a given radius using an ADQL command.
 *
 * @param {number} ra - Right Ascension of the image center (degrees)
 * @param {number} dec - Declination of the image center (degrees)
 * @param {number} radiusDeg - Search radius in degrees
 * @param {number} minMagnitude - Reserved for future magnitude filtering; not currently applied
 *   (SIMBAD TAP magnitude filtering requires a JOIN on the flux table — accepted for API
 *   compatibility with the local catalog path but has no effect on SIMBAD results)
 * @returns {Promise<Array>} List of recognized celestial objects
 */
export async function querySimbad(ra, dec, radiusDeg, minMagnitude = 13.5) {
  // Query for basic data, filtering to Galaxies (G), Quasars (QSO), Planetary Nebulae (PN), HII regions, and Stars.
  // The row cap is raised (see SIMBAD_RESULT_CAP) so the deep field returns a richer object list.
  const adqlQuery = `
    SELECT TOP ${SIMBAD_RESULT_CAP} basic.MAIN_ID, basic.OTYPE, basic.RA, basic.DEC
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
  `;

  const startedAt = Date.now();
  try {
    const response = await axios.get(SIMBAD_TAP_URL, {
      timeout: 10_000,
      params: {
        request: "doQuery",
        lang: "adql",
        format: "json",
        query: adqlQuery,
      },
    });

    if (response.data && response.data.data) {
      return response.data.data.map(
        (row) =>
          new CatalogObject(
            row[0],
            row[1],
            parseFloat(row[2]),
            parseFloat(row[3]),
            null,
            "simbad",
            undefined,
            undefined,
            undefined,
            null,
          ),
      );
    }

    return [];
  } catch (err) {
    // Build rich diagnostic context so the analytics row alone is enough
    // to figure out what SIMBAD did (HTTP 4xx with TAP error XML, network
    // ECONNRESET, etc.) without needing the user to reproduce.
    const httpStatus = err.response?.status ?? null;
    const responseBody =
      err.response?.data == null
        ? null
        : typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data);
    const details = {
      status: httpStatus
        ? "http_error"
        : err.code
          ? "network_error"
          : "parse_error",
      http_status: httpStatus,
      error_code: err.code ?? null,
      error_message: err.message,
      request_url: err.config?.url ?? SIMBAD_TAP_URL,
      response_body_tail: tail(responseBody),
      adql: adqlQuery.trim(),
      elapsed_ms: Date.now() - startedAt,
    };
    throw new CatalogError(
      "simbad",
      `SIMBAD TAP query failed: ${err.message}`,
      details,
    );
  }
}
