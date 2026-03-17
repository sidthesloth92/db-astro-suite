import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import packageJson from '../../../../package.json';
import { CaptionSectionComponent } from './components/caption-section/caption-section';
import { AnnotationControlsComponent } from './components/card-form/annotation-controls';
import { CardFormComponent } from './components/card-form/card-form';
import { CardPreviewComponent } from './components/card-preview/card-preview';
import { StellarMapPreviewComponent } from './components/stellar-map-preview/stellar-map-preview';
import { CardDataService } from './services/card-data.service';

import { HeaderComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-ag-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardFormComponent,
    AnnotationControlsComponent,
    CardPreviewComponent,
    StellarMapPreviewComponent,
    CaptionSectionComponent,
    HeaderComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  dataService = inject(CardDataService);
  appVersion = packageJson.version || '1.0.0';
}
