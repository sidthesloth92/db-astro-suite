import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface SimbadResult {
  id: string;
  type: string;
  ra: number;
  dec: number;
  mag: number;
}

@Injectable({
  providedIn: 'root',
})
export class SimbadService {
  private readonly baseUrl = 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync';

  constructor(private http: HttpClient) {}

  /**
   * Search SIMBAD by object name (e.g. 'M 42', 'Barnard 33')
   */
  async searchObject(name: string): Promise<SimbadResult | null> {
    const query = `SELECT main_id, otype, ra, dec, flux_v FROM basic WHERE ident='${name.trim()}'`;

    // TAP API requires HTTP POST or GET with specific parameters
    const params = new HttpParams()
      .set('request', 'doQuery')
      .set('lang', 'adql')
      .set('format', 'json')
      .set('query', query);

    try {
      const res = await firstValueFrom(this.http.get<any>(this.baseUrl, { params }));

      if (res && res.data && res.data.length > 0) {
        const row = res.data[0];
        // response format is usually [[main_id, otype, ra, dec, flux_v]]
        return {
          id: row[0],
          type: row[1],
          ra: row[2],
          dec: row[3],
          mag: row[4] !== null ? parseFloat(row[4]) : 10, // fallback magnitude
        };
      }
      return null;
    } catch (e) {
      console.error('SIMBAD lookup failed:', e);
      return null;
    }
  }
}
