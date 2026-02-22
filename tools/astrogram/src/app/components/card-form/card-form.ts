import { Component, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent, AccordionItemComponent } from '@db-astro-suite/ui';
import { CardSettingsComponent } from './card-settings';
import { ImageDetailsComponent } from './image-details';
import { IntegrationSettingsComponent } from './integration-settings';
import { EquipmentSettingsComponent } from './equipment-settings';
import { SoftwareSettingsComponent } from './software-settings';
import { BortleSettingsComponent } from './bortle-settings';

@Component({
  selector: 'dba-ag-card-form',
  standalone: true,
  imports: [
    CommonModule, 
    AccordionComponent, 
    AccordionItemComponent,
    CardSettingsComponent,
    ImageDetailsComponent,
    IntegrationSettingsComponent,
    EquipmentSettingsComponent,
    SoftwareSettingsComponent,
    BortleSettingsComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './card-form.html',
  styleUrls: ['./card-form.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CardFormComponent {}
