export interface AstroSolveResponse {
  status: string;
  metadata: {
    ra: number;
    dec: number;
    scale: number;
    wcs: string;
    radius_searched: number;
  };
  objects: Array<{
    name: string;
    type: string;
    ra: number;
    dec: number;
    magnitude: number;
    source: 'local' | 'simbad';
    catalog?: string;
    entryId?: string;
    commonName?: string;
    sizeArcmin?: number | null;
  }>;
}
