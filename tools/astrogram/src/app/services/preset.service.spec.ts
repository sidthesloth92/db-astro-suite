import { TestBed } from '@angular/core/testing';
import type { EquipmentItem, SoftwareItem } from '../models/card-data.model';
import { PresetService } from './preset.service';
import type { PresetsRecord } from './preset.types';

/**
 * Tests for PresetService.
 *
 * NOTE: PresetService currently reads/writes `window.localStorage` directly
 * rather than the `STORAGE_SERVICE_TOKEN` abstraction documented in
 * `.claude/rules/angular.md`. Until that refactor lands, these tests mock
 * the global `localStorage` via Jasmine spies and a Map-backed fake store —
 * they do not touch real persistent storage.
 */
describe('PresetService', () => {
  const STORAGE_KEY = 'astrogram_equipment_presets';
  let store: Map<string, string>;

  const sampleEquipment: EquipmentItem[] = [
    { icon: '🔭', label: 'Telescope', value: 'Askar 103 APO' },
    { icon: '📷', label: 'Camera', value: 'ZWO ASI2600MM Air' },
  ];
  const sampleSoftware: SoftwareItem[] = [
    { icon: '💻', label: 'Computer', name: 'ASIAIR' },
    { icon: '⚙️', label: 'Editing', name: 'PixInsight' },
  ];

  const installStorageMock = (): void => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store.get(key) ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      store.set(key, value);
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      store.delete(key);
    });
  };

  beforeEach(() => {
    store = new Map<string, string>();
    installStorageMock();
    TestBed.configureTestingModule({});
  });

  describe('construction', () => {
    it('initialises presets() to an empty record when storage is empty', () => {
      const service = TestBed.inject(PresetService);
      expect(service.presets()).toEqual({});
      expect(service.getPresets()).toEqual({});
    });

    it('hydrates presets() from storage on construction', () => {
      const seeded: PresetsRecord = {
        'My Rig': { equipment: sampleEquipment, software: sampleSoftware },
      };
      store.set(STORAGE_KEY, JSON.stringify(seeded));

      const service = TestBed.inject(PresetService);

      expect(service.presets()).toEqual(seeded);
    });

    it('returns an empty record when stored JSON is malformed', () => {
      store.set(STORAGE_KEY, '{not valid json');

      const service = TestBed.inject(PresetService);

      expect(service.presets()).toEqual({});
    });

    it('migrates the legacy array-only format (equipment array, no software) into RigPreset shape', () => {
      // Legacy v1 stored EquipmentItem[] directly under the preset name.
      const legacy = { Legacy: sampleEquipment };
      store.set(STORAGE_KEY, JSON.stringify(legacy));

      const service = TestBed.inject(PresetService);

      expect(service.presets()['Legacy']).toEqual({
        equipment: sampleEquipment,
        software: [],
      });
    });
  });

  describe('savePreset', () => {
    it('persists a new preset to storage and updates the signal', () => {
      const service = TestBed.inject(PresetService);

      service.savePreset('Backyard Rig', sampleEquipment, sampleSoftware);

      expect(service.presets()['Backyard Rig']).toEqual({
        equipment: sampleEquipment,
        software: sampleSoftware,
      });
      const persisted = JSON.parse(store.get(STORAGE_KEY) ?? '{}') as PresetsRecord;
      expect(persisted['Backyard Rig']).toEqual({
        equipment: sampleEquipment,
        software: sampleSoftware,
      });
    });

    it('overwrites an existing preset of the same name rather than appending', () => {
      const service = TestBed.inject(PresetService);
      service.savePreset('My Rig', sampleEquipment, sampleSoftware);

      const updatedEquipment: EquipmentItem[] = [
        { icon: '🔭', label: 'Telescope', value: 'RedCat 51' },
      ];
      service.savePreset('My Rig', updatedEquipment, []);

      expect(Object.keys(service.presets())).toEqual(['My Rig']);
      expect(service.presets()['My Rig']).toEqual({
        equipment: updatedEquipment,
        software: [],
      });
    });

    it('appends additional presets without disturbing existing ones', () => {
      const service = TestBed.inject(PresetService);
      service.savePreset('Rig A', sampleEquipment, sampleSoftware);
      service.savePreset('Rig B', [], []);

      const names = Object.keys(service.presets()).sort();
      expect(names).toEqual(['Rig A', 'Rig B']);
      expect(service.presets()['Rig A']).toEqual({
        equipment: sampleEquipment,
        software: sampleSoftware,
      });
    });

    it('produces a new presets() reference (no in-place mutation)', () => {
      const service = TestBed.inject(PresetService);
      const before = service.presets();

      service.savePreset('New', sampleEquipment, sampleSoftware);

      expect(service.presets()).not.toBe(before);
    });

    it('deep-clones equipment so later mutations to the input array do not leak in', () => {
      const service = TestBed.inject(PresetService);
      const liveEquipment: EquipmentItem[] = [{ icon: '🔭', label: 'Telescope', value: 'Askar' }];
      service.savePreset('Snapshot', liveEquipment, []);

      liveEquipment[0].value = 'MUTATED';

      expect(service.presets()['Snapshot'].equipment[0].value).toBe('Askar');
    });
  });

  describe('deletePreset', () => {
    it('removes the named preset from storage and signal', () => {
      const service = TestBed.inject(PresetService);
      service.savePreset('A', sampleEquipment, []);
      service.savePreset('B', [], sampleSoftware);

      service.deletePreset('A');

      expect(Object.keys(service.presets())).toEqual(['B']);
      const persisted = JSON.parse(store.get(STORAGE_KEY) ?? '{}') as PresetsRecord;
      expect(Object.keys(persisted)).toEqual(['B']);
    });

    it('is a no-op when the preset name does not exist', () => {
      const service = TestBed.inject(PresetService);
      service.savePreset('A', sampleEquipment, []);
      const before = service.presets();

      service.deletePreset('does-not-exist');

      // Same reference is acceptable evidence the no-op branch was taken.
      expect(service.presets()).toBe(before);
    });

    it('leaves storage empty when the last preset is deleted', () => {
      const service = TestBed.inject(PresetService);
      service.savePreset('Only', sampleEquipment, sampleSoftware);

      service.deletePreset('Only');

      expect(service.presets()).toEqual({});
      expect(JSON.parse(store.get(STORAGE_KEY) ?? '{}')).toEqual({});
    });
  });

  describe('round trip', () => {
    it('rehydrates a saved preset when a new service instance reads the same storage', () => {
      const first = TestBed.inject(PresetService);
      first.savePreset('Persisted', sampleEquipment, sampleSoftware);

      // Reset the TestBed so a fresh PresetService is constructed; the
      // mocked `localStorage` (Map-backed `store`) survives across the reset.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const second = TestBed.inject(PresetService);

      expect(second.presets()['Persisted']).toEqual({
        equipment: sampleEquipment,
        software: sampleSoftware,
      });
    });
  });
});
