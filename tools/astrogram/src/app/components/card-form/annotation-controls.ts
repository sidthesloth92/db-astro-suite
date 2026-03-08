import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { ImageAnnotation } from '../../models/annotation.models';
import { StellarMapData } from '../../models/card-data';
import { AstrosolveService } from '../../services/astrosolve.service';
import { CardDataService } from '../../services/card-data.service';
import { WcsService } from '../../services/wcs.service';
@Component({
  selector: 'dba-ag-annotation-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './annotation-controls.html',
  exportAs: 'dbaAnnotationControls',
  styles: [
    `
      :host {
        display: block;
        padding: 1.5rem;
        font-family: var(--db-form-font-mono, monospace);
      }
      .controls-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .upload-card {
        border: 2px dashed rgba(255, 45, 149, 0.3);
        background: rgba(255, 45, 149, 0.05);
        border-radius: var(--db-radius-lg);
        padding: 2.5rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: center;
      }
      .upload-card:hover {
        border-color: var(--neon-pink);
        background: rgba(255, 45, 149, 0.1);
        box-shadow: 0 0 20px rgba(255, 45, 149, 0.15);
        transform: translateY(-2px);
      }
      .upload-card.has-image {
        border-style: solid;
        border-color: rgba(0, 243, 255, 0.3);
        background: rgba(0, 243, 255, 0.05);
      }
      .upload-card.has-image:hover {
        border-color: #00f3ff;
      }
      .upload-icon {
        width: 48px;
        height: 48px;
        color: var(--neon-pink);
        margin-bottom: 0.5rem;
      }
      .upload-card.has-image .upload-icon {
        color: #00f3ff;
      }
      .upload-title {
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: white;
      }
      .upload-subtitle {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--neon-pink);
        opacity: 0.8;
      }
      .upload-card.has-image .upload-subtitle {
        color: #00f3ff;
      }
      .action-btns {
        display: block;
      }
      .solve-btn {
        background: transparent;
        color: var(--neon-pink);
        border: 1px solid var(--neon-pink);
        width: 100%;
        padding: 1rem;
        border-radius: var(--db-radius-md);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .solve-btn:hover:not(:disabled) {
        background: rgba(255, 45, 149, 0.1);
        box-shadow: 0 0 20px rgba(255, 45, 149, 0.3);
        transform: translateY(-2px);
      }
      .solve-btn:active:not(:disabled) {
        background: var(--neon-pink);
        color: white;
      }
      .solve-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        border-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.3);
      }
      .status-text {
        font-size: 0.8rem;
        font-weight: bold;
        color: var(--neon-pink);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-align: center;
        margin-top: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AnnotationControlsComponent {
  dataService = inject(CardDataService);

  mapData = this.dataService.stellarMapData;
  isSolving = signal(false);
  solveStatus = signal('');

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  resetMap() {
    this.mapData.update((d) => ({
      ...d,
      backgroundImage: null,
      rawFile: null,
      annotations: [],
      isSolving: false,
      naturalWidth: undefined,
      naturalHeight: undefined,
    }));
    this.solveStatus.set('');
  }

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
        const result = e.target?.result as string;

        // Use a temporary image to detect natural dimensions for the WCS engine
        const img = new Image();
        img.onload = () => {
          this.mapData.update((d) => ({
            ...d,
            backgroundImage: result,
            rawFile: file,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          }));
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  }

  astrosolveService = inject(AstrosolveService);
  wcsService = inject(WcsService);

  async triggerPlateSolve() {
    const file = this.mapData().rawFile;
    if (!file) {
      this.solveStatus.set('Error: No image uploaded.');
      return;
    }

    this.isSolving.set(true);
    this.mapData.update((d) => ({ ...d, isSolving: true }));
    this.solveStatus.set('Starting plate solve...');

    try {
      // Determine which catalog types to request based on UI toggles
      const types = [];
      if (this.mapData().filters.showMessier) types.push('M');
      if (this.mapData().filters.showNgc)
        types.push('NGC/IC', 'NGC', 'IC', 'Neb', 'G', 'PN', 'OCl');
      if (this.mapData().filters.showNamedStars) types.push('Star');

      const hints = {
        types: types.length > 0 ? types : undefined,
      };

      console.log('Triggering solve with hints:', hints);
      const result = await this.astrosolveService.solveImage(file, hints, (msg) => {
        this.solveStatus.set(msg);
      });

      console.log('Solve Result SUCCESS:', result);
      console.log(`Found ${result.objects.length} candidate objects.`);

      // Initialize the WCS projection engine with the actual input image dimensions
      this.wcsService.resetLogCount();
      const nW = this.mapData().naturalWidth || 1080;
      const nH = this.mapData().naturalHeight || 1080;
      this.wcsService.initialize(result.metadata.wcs, nW, nH);

      // Map backend Hybrid results to frontend ImageAnnotations with precision projection
      const annotations: ImageAnnotation[] = result.objects
        .map((obj) => {
          const coords = this.wcsService.skyToPix(obj.ra, obj.dec);

          return {
            id: obj.entryId || obj.name,
            label: obj.commonName || obj.name,
            name: obj.name,
            commonName: obj.commonName,
            x: obj.ra,
            y: obj.dec,
            xPercent: coords ? (coords.x / nW) * 100 : 0,
            yPercent: coords ? (coords.y / nH) * 100 : 0,
            radius: 20,
            radiusDb: 20,
            visible: coords !== null,
            source: obj.source,
            type: obj.type,
          };
        })
        .filter(
          (a) =>
            a.visible &&
            a.xPercent >= 0 &&
            a.xPercent <= 100 &&
            a.yPercent >= 0 &&
            a.yPercent <= 100,
        ); // Only keep annotations that fall within the frame

      console.log(
        `Mapped ${annotations.length} out of ${result.objects.length} objects from solver.`,
      );

      this.mapData.update((d: StellarMapData) => ({
        ...d,
        annotations,
      }));

      this.solveStatus.set(`Success! Identified ${annotations.length} objects.`);
    } catch (err: any) {
      console.error('Plate solve failed:', err);
      this.solveStatus.set(`Error: ${err.message}`);
    } finally {
      this.isSolving.set(false);
      this.mapData.update((d) => ({ ...d, isSolving: false }));
      // Clear status after a few seconds on success
      if (!this.solveStatus().startsWith('Error')) {
        setTimeout(() => this.solveStatus.set(''), 5000);
      }
    }
  }
}
