import { DataCreditGroup, DataCreditLicense } from './data-credits.model';

/** GNU General Public License, version 3 or later. */
const GPL_3_OR_LATER: DataCreditLicense = {
  name: 'GPL-3.0-or-later',
  url: 'https://www.gnu.org/licenses/gpl-3.0.html',
};

/** Creative Commons Attribution-ShareAlike 4.0 International. */
const CC_BY_SA_4: DataCreditLicense = {
  name: 'CC BY-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** Creative Commons Attribution-NonCommercial 3.0 IGO (the license ESA states for Gaia data). */
const CC_BY_NC_3_IGO: DataCreditLicense = {
  name: 'CC BY-NC 3.0 IGO',
  url: 'https://creativecommons.org/licenses/by-nc/3.0/igo/',
};

/**
 * Every third-party source behind Astrogram's plate solving, star map labels,
 * distances and Wiki descriptions, grouped for the Data credits dialog. Keep
 * in sync with the "Third-party software and data" section of the root NOTICE
 * file and with the catalogs loaded by
 * tools/astrosolve/server/scripts/data/init-local-catalog-db.mjs.
 */
export const DATA_CREDIT_GROUPS: readonly DataCreditGroup[] = [
  {
    title: 'Plate solving',
    credits: [
      {
        name: 'Astrometry.net',
        usedFor: 'Works out exactly where your photo points in the sky.',
        credit:
          'Lang, D., Hogg, D. W., Mierle, K., Blanton, M. & Roweis, S. (2010). ' +
          '"Astrometry.net: Blind astrometric calibration of arbitrary astronomical images." ' +
          'The Astronomical Journal, 139, 1782.',
        license: GPL_3_OR_LATER,
        url: 'https://astrometry.net',
      },
      {
        name: 'Tycho-2 and 2MASS',
        usedFor: 'Star patterns in the Astrometry.net index files used for solving.',
        credit:
          'Tycho-2 comes from the ESA Hipparcos mission. 2MASS (the Two Micron All Sky Survey) is a ' +
          'joint project of the University of Massachusetts and the Infrared Processing and Analysis ' +
          'Center/California Institute of Technology, funded by NASA and the National Science Foundation.',
        url: 'https://data.astrometry.net',
      },
    ],
  },
  {
    title: 'Object names, positions and distances',
    credits: [
      {
        name: 'Gaia DR3',
        usedFor: 'Star positions, Gaia labels and star distances.',
        credit:
          'This work has made use of data from the European Space Agency (ESA) mission Gaia, ' +
          'processed by the Gaia Data Processing and Analysis Consortium (DPAC). Credit: ESA/Gaia/DPAC.',
        license: CC_BY_NC_3_IGO,
        url: 'https://www.cosmos.esa.int/gaia',
      },
      {
        name: 'Hipparcos and Tycho-2',
        usedFor: 'Positions and distances for HD stars.',
        credit: 'From the ESA Hipparcos mission.',
        url: 'https://www.cosmos.esa.int/web/hipparcos',
      },
      {
        name: 'OpenNGC',
        usedFor: 'NGC, IC and Messier names, positions and sizes.',
        credit: 'OpenNGC by Mattia Verga.',
        license: CC_BY_SA_4,
        url: 'https://github.com/mattiaverga/OpenNGC',
      },
      {
        name: 'IAU Catalog of Star Names',
        usedFor: 'Proper star names such as Betelgeuse and Vega.',
        credit: 'IAU Working Group on Star Names (WGSN).',
        url: 'https://www.pas.rochester.edu/~emamajek/WGSN/',
      },
      {
        name: 'SIMBAD and VizieR',
        usedFor: 'Object distances, and access to the catalogs below.',
        credit:
          'Astrogram uses the SIMBAD database and the VizieR catalogue access tool, ' +
          'operated at CDS, Strasbourg, France.',
        url: 'https://cds.unistra.fr',
      },
      {
        name: 'Catalogs from VizieR',
        usedFor: 'Nebulae, galaxies, clusters, quasars and star cross-identifications.',
        credit:
          'Sharpless HII regions (VII/20), Abell galaxy clusters (VII/110A), RC3 (VII/155), ' +
          'HyperLEDA PGC (VII/237), Milliquas (VII/294), Lynds bright nebulae (VII/9B), ' +
          'Lynds dark nebulae (VII/7A), Barnard dark nebulae (VII/220A), Milky Way Star Clusters ' +
          '(J/A+A/558/A53), Harris globular clusters (VII/202), Hipparcos (I/239), Tycho-2 (I/259) ' +
          'and Tycho-2 HD identifications (III/231). We acknowledge the usage of the HyperLEDA database.',
      },
      {
        name: 'Published distances',
        usedFor: 'Backup distances for a few famous nebulae.',
        credit: 'Rounded values from published references, including the NASA/IPAC Extragalactic Database (NED).',
      },
    ],
  },
  {
    title: 'Text',
    credits: [
      {
        name: 'Wikipedia',
        usedFor: 'Object descriptions added by the Wiki button.',
        credit: 'Text from Wikipedia articles. If you post it, credit Wikipedia.',
        license: CC_BY_SA_4,
        url: 'https://en.wikipedia.org',
      },
    ],
  },
];
