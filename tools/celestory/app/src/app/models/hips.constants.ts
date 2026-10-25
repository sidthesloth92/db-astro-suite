/** Deep-sky survey (HiPS) configuration: DSS2 colour from CDS. */
export const HIPS_SURVEY = {
  /** Tile root (`NorderK/DirD/NpixN.jpg`). */
  baseUrl: 'https://alasky.cds.unistra.fr/DSS/DSSColor',
  /** Deepest available order. */
  maxOrder: 9,
  /** Shallowest order we draw (coarser tiles are too distorted). */
  minOrder: 3,
  /** Tile width in pixels. */
  tileSize: 512,
  /** Required attribution (ODbL). */
  credit: 'Deep sky: DSS2 (STScI/NASA, coloured and HEALPixed by CDS)',
} as const;

/** FOV (degrees) above which the survey is fully hidden, and below which it is fully shown. */
export const HIPS_FADE_START_FOV = 34;
export const HIPS_FADE_END_FOV = 20;

/** Most tile textures kept on the GPU. */
export const HIPS_CACHE_SIZE = 320;

/** Concurrent tile downloads. */
export const HIPS_MAX_INFLIGHT = 10;

/** Mesh subdivision per tile edge (more at low orders where cells are more distorted). */
export const HIPS_MESH_DIVISIONS_LOW_ORDER = 8;
export const HIPS_MESH_DIVISIONS = 4;
