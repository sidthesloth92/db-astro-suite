import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardDataService } from '../../services/card-data.service';
import { AstrometryService } from '../../services/astrometry.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ImageAnnotation } from '../../models/annotation.models';

@Component({
  selector: 'dba-ag-annotation-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './annotation-controls.html',
  styles: [
    `
      :host {
        display: block;
        padding: 1rem;
      }
      .controls-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .instructions {
        font-size: 0.8rem;
        opacity: 0.7;
        line-height: 1.4;
      }
      .solve-btn {
        background: var(--neon-pink);
        color: white;
        border: none;
        padding: 0.75rem 1rem;
        border-radius: var(--db-radius-md);
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .solve-btn:hover {
        background: #ff47a3;
        box-shadow: 0 0 15px rgba(255, 45, 149, 0.4);
      }
      .solve-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .upload-btn {
        background: transparent;
        color: var(--neon-pink);
        border: 1px solid var(--neon-pink);
        padding: 0.5rem;
        border-radius: var(--db-radius-md);
        font-weight: bold;
        text-transform: uppercase;
        cursor: pointer;
        text-align: center;
        margin-bottom: 0.5rem;
      }
      .status-text {
        font-size: 0.8rem;
        color: var(--neon-pink);
        text-align: center;
        margin-bottom: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AnnotationControlsComponent {
  dataService = inject(CardDataService);
  astrometry = inject(AstrometryService);
  http = inject(HttpClient);

  mapData = this.dataService.stellarMapData;
  isSolving = false;
  solveStatus = '';

  toggleFilter(key: 'showMessier' | 'showNgc' | 'showNamedStars') {
    this.mapData.update((d) => ({
      ...d,
      filters: {
        ...d.filters,
        [key]: !d.filters[key],
      },
    }));
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.mapData.update((d) => ({ ...d, backgroundImage: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  }

  // Helper to convert the dataURI we loaded back to a File for Astrometry
  private dataURItoFile(dataURI: string, filename: string): File {
    const arr = dataURI.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  async triggerPlateSolve() {
    const bg = this.mapData().backgroundImage;
    if (!bg) return;

    this.isSolving = true;
    this.solveStatus = 'Preparing image...';

    try {
      const file = this.dataURItoFile(bg, 'upload.jpg');

      // Fetch the local JSON database (use window.MOCK_DB if available for E2E)
      this.solveStatus = 'Loading local database...';
      const dbUrl = new URL(
        'assets/data/objects_db.json',
        window.location.origin + window.location.pathname,
      ).href;
      let localDbRaw: any;
      try {
        if ((window as any).MOCK_DB) {
          localDbRaw = (window as any).MOCK_DB;
        } else {
          localDbRaw = await firstValueFrom(this.http.get<any>(dbUrl));
        }
      } catch (err: any) {
        console.error('DB Fetch Error:', err);
        throw new Error('Could not load local objects API DB.');
      }

      // Call the astrometry service
      const annotationsRaw = await this.astrometry.solveImage(file, (msg) => {
        this.solveStatus = msg;
      });

      this.solveStatus = 'Processing annotations...';

      // Cross-reference Astrometry names with our local DB
      const processed: ImageAnnotation[] = [];

      for (const ann of annotationsRaw) {
        // Astrometry provides an array of names for a single object
        const matchedName = ann.names.find((n) => localDbRaw[n.trim()]);
        const localObj = matchedName ? localDbRaw[matchedName.trim()] : null;

        // Astrometry returns radius in degrees, we map it, but our LocalDB has sizeId in arcmin
        // We calculate an expected pixel radius
        let pixelRadius = ann.radius > 0 ? ann.radius * 30 : 20; // Rough fallback
        if (localObj && localObj.sizeId) {
          // If local obj has size in arcmin, map to pixel radius roughly based on Astrometry's scale
          // For now just multiply by a constant factor since we don't have exactly the arcsec/pixel easily accessible here
          pixelRadius = Math.max(localObj.sizeId * 2, 10);
        }

        const primaryName = matchedName || ann.names[0];

        processed.push({
          id: primaryName,
          label: primaryName,
          xPercent: (ann.pixelx / 1080) * 100, // We assume roughly 1080x1350 target canvas
          yPercent: (ann.pixely / 1350) * 100,
          radiusDb: pixelRadius,
          visible: true,
        });
      }

      this.mapData.update((d) => ({ ...d, annotations: processed }));
      this.solveStatus = 'Done!';
    } catch (e: any) {
      console.error(e);
      alert('Plate solving failed: ' + e.message);
      this.solveStatus = 'Failed to solve.';
    } finally {
      this.isSolving = false;
      setTimeout(() => (this.solveStatus = ''), 3000);
    }
  }
}
