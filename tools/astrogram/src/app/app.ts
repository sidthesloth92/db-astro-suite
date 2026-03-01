import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardFormComponent } from './components/card-form/card-form';
import { CardPreviewComponent } from './components/card-preview/card-preview';
import { CaptionSectionComponent } from './components/caption-section/caption-section';
import { CardDataService } from './services/card-data.service';
import packageJson from '../../../../package.json';

import { HeaderComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-ag-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CardFormComponent, CardPreviewComponent, CaptionSectionComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  dataService = inject(CardDataService);
  appVersion = packageJson.version || '1.0.0';
}
