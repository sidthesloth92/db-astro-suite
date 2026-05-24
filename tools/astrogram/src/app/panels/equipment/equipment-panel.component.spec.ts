import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import type { CardData } from '../../models/card-data.model';
import { DEFAULT_FILTERS } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { PresetService } from '../../services/preset.service';
import { EquipmentPanelComponent } from './equipment-panel.component';

const seed = (): CardData => ({
  title: 'X',
  date: '2026-05-20',
  location: 'Irving',
  author: '@a',
  filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
  equipment: [
    { icon: '🔭', label: 'Telescope', value: 'Askar 103' },
  ],
  software: [{ icon: '💻', label: 'Computer', name: 'ASIAIR' }],
  bortleScale: 9,
  pixelSize: 3.76,
  focalLength: null,
  accentColor: '#ff2d95',
  secondaryAccentColor: '#00E5FF',
  cardOpacity: 0.6,
  backgroundImage: null,
  aspectRatio: '3:4',
});

function makeAnalyticsStub(): Record<string, jasmine.Spy> {
  return new Proxy({} as Record<string, jasmine.Spy>, {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = jasmine.createSpy(prop);
      }
      return target[prop];
    },
  });
}

describe('EquipmentPanelComponent', () => {
  let dataStub: {
    cardData: ReturnType<typeof signal<CardData>>;
    updateData: jasmine.Spy;
    mutateData: jasmine.Spy;
  };
  type PresetShape = { equipment: unknown[]; software: unknown[] };
  let presetStub: {
    presets: ReturnType<typeof signal<Record<string, PresetShape>>>;
    getEquipmentPresets: jasmine.Spy;
    saveEquipmentPreset: jasmine.Spy;
  };
  let analyticsStub: Record<string, jasmine.Spy>;

  beforeEach(async () => {
    dataStub = {
      cardData: signal<CardData>(seed()),
      updateData: jasmine.createSpy('updateData'),
      mutateData: jasmine.createSpy('mutateData').and.callFake((fn: (d: CardData) => void) => {
        dataStub.cardData.update((d) => {
          const cloned: CardData = JSON.parse(JSON.stringify(d));
          fn(cloned);
          return cloned;
        });
      }),
    };
    presetStub = {
      presets: signal<Record<string, PresetShape>>({
        'Backyard SHO': {
          equipment: [{ icon: '🔭', label: 'Telescope', value: 'Askar 103' }],
          software: [{ icon: '💻', label: 'Computer', name: 'ASIAIR' }],
        },
      }),
      getEquipmentPresets: jasmine.createSpy('getEquipmentPresets').and.returnValue({
        'Backyard SHO': [{ icon: '🔭', label: 'Telescope', value: 'Askar 103' }],
      }),
      saveEquipmentPreset: jasmine.createSpy('saveEquipmentPreset'),
    };
    analyticsStub = makeAnalyticsStub();

    await TestBed.configureTestingModule({
      imports: [EquipmentPanelComponent],
      providers: [
        { provide: CardDataService, useValue: dataStub },
        { provide: PresetService, useValue: presetStub },
        { provide: AnalyticsService, useValue: analyticsStub },
      ],
    }).compileComponents();
  });

  it('applies a preset on click and tracks the change', () => {
    const fixture = TestBed.createComponent(EquipmentPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.activatePreset('Backyard SHO');
    expect(analyticsStub['trackSettingChanged']).toHaveBeenCalledWith(
      'equipment_preset',
      'Backyard SHO',
    );
    expect(dataStub.mutateData).toHaveBeenCalled();
  });

  it('does not save a preset with an empty name', () => {
    const fixture = TestBed.createComponent(EquipmentPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.startSavePreset();
    fixture.componentInstance.confirmSavePreset();
    expect(presetStub.saveEquipmentPreset).not.toHaveBeenCalled();
  });

  it('updates an equipment field on input', () => {
    const fixture = TestBed.createComponent(EquipmentPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.updateEquipment(0, 'Askar 71F');
    expect(dataStub.cardData().equipment[0].value).toBe('Askar 71F');
  });
});
