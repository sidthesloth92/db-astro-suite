import type { EquipmentItem, SoftwareItem } from '../models/card-data.model';

/** Full rig snapshot stored in a preset: hardware + software pipeline. */
export interface RigPreset {
  readonly equipment: EquipmentItem[];
  readonly software: SoftwareItem[];
}

/** The localStorage record: preset name → preset data. */
export type PresetsRecord = Record<string, RigPreset>;
