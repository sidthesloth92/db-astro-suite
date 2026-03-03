import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AstrometryAnnotation {
  type: string;
  names: string[];
  pixelx: number;
  pixely: number;
  radius: number;
}

@Injectable({
  providedIn: 'root',
})
export class AstrometryService {
  private readonly baseUrl = 'https://corsproxy.io/?https://nova.astrometry.net/api';
  private sessionToken: string | null = null;
  private apiKey = environment.astrometryApiKey;

  constructor(private http: HttpClient) {}

  async login(apiKey?: string): Promise<string> {
    const keyToUse = apiKey || this.apiKey;
    const requestJson = JSON.stringify({ apikey: keyToUse });
    const params = new HttpParams().set('request-json', requestJson);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const res = await firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/login`, params.toString(), { headers }),
    );

    if (res.status === 'success') {
      this.sessionToken = res.session;
      return this.sessionToken!;
    }
    throw new Error('Astrometry login failed: ' + res.errormessage);
  }

  async uploadImage(file: File, hints?: any): Promise<number> {
    if (!this.sessionToken) await this.login();

    const requestJson: any = {
      session: this.sessionToken,
      allow_commercial_use: 'd',
      allow_modifications: 'd',
      publicly_visible: 'n',
    };

    if (hints) {
      if (hints.scale_lower && hints.scale_upper) {
        requestJson.scale_lower = hints.scale_lower;
        requestJson.scale_upper = hints.scale_upper;
        requestJson.scale_type = hints.scale_type || 'ul';
      }
      if (hints.downsample) requestJson.downsample_factor = hints.downsample;
    }

    const requestJsonStr = JSON.stringify(requestJson);
    const params = new HttpParams().set('request-json', requestJsonStr);

    // We cannot send a File directly in x-www-form-urlencoded.
    // The Astrometry API docs explicitly state upload requires multipart/form-data.
    const formData = new FormData();
    formData.append('request-json', requestJsonStr);
    formData.append('file', file);

    const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/upload`, formData));

    if (res.status === 'success') {
      return res.subid;
    }
    throw new Error('Astrometry upload failed');
  }

  async getSubmissionStatus(
    subId: number,
  ): Promise<{ processing_started: string; job_calibrations: number[][] }> {
    const res = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/submissions/${subId}`));
    return res;
  }

  async getJobStatus(jobId: number): Promise<string> {
    const res = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/jobs/${jobId}`));
    return res.status;
  }

  async getAnnotations(jobId: number): Promise<AstrometryAnnotation[]> {
    const res = await firstValueFrom(
      this.http.get<any>(`${this.baseUrl}/jobs/${jobId}/annotations/`),
    );
    return res.annotations || [];
  }

  // Helper method for the full polling flow
  async solveImage(
    file: File,
    onProgress?: (msg: string) => void,
  ): Promise<AstrometryAnnotation[]> {
    onProgress?.('Logging in to Astrometry.net...');
    await this.login();

    onProgress?.('Uploading image...');
    const subId = await this.uploadImage(file, { downsample: 2 });

    onProgress?.(`Image uploaded (Sub ID: ${subId}). Waiting for job to start...`);
    let jobId: number | null = null;

    // Poll submission until job starts
    while (!jobId) {
      await new Promise((r) => setTimeout(r, 3000));
      const subStatus = await this.getSubmissionStatus(subId);
      if (subStatus.job_calibrations && subStatus.job_calibrations.length > 0) {
        // Find first successful job calibration
        for (const calib of subStatus.job_calibrations) {
          jobId = calib[0]; // Try the first job id associated
          break;
        }
      }
    }

    onProgress?.(`Job started (Job ID: ${jobId}). Solving...`);

    // Poll job until complete
    let status = '';
    while (status !== 'success') {
      await new Promise((r) => setTimeout(r, 5000));
      status = await this.getJobStatus(jobId);
      if (status === 'failure') throw new Error('Astrometry job failed to solve the image.');
      if (status !== 'success') onProgress?.(`Solving... (Status: ${status})`);
    }

    onProgress?.('Solve successful! Fetching object annotations...');
    const annotations = await this.getAnnotations(jobId);

    onProgress?.(`Found ${annotations.length} objects.`);
    return annotations;
  }
}
