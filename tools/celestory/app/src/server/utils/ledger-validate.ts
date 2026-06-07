import { LedgerValidationError } from './celestory.error';
import {
  MAX_EQUIPMENT,
  MAX_OBJECTS,
  SUPPORTED_SCHEMA_VERSION,
} from './ledger.constants';
import type {
  EquipmentItem,
  Ledger,
  ObjectTimeline,
  Summary,
} from './ledger.types';

/** Narrow an unknown value to a plain object, or throw. */
function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new LedgerValidationError(`Expected "${field}" to be an object.`);
  }
  return value as Record<string, unknown>;
}

/** Narrow an unknown value to an array, or throw. */
function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new LedgerValidationError(`Expected "${field}" to be an array.`);
  }
  return value;
}

/** Read a finite number from a record field, defaulting to 0. */
function num(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Read a string from a record field, defaulting to ''. */
function str(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === 'string' ? value : '';
}

/** Validate one object timeline entry into a typed shape. */
function validateObject(value: unknown, index: number): ObjectTimeline {
  const record = asRecord(value, `objects[${index}]`);
  const id = str(record, 'id');
  if (!id) {
    throw new LedgerValidationError(`objects[${index}] is missing "id".`);
  }
  return {
    id,
    displayName: str(record, 'displayName'),
    designation: str(record, 'designation'),
    aliases: Array.isArray(record['aliases'])
      ? (record['aliases'] as unknown[]).map((a) => String(a))
      : [],
    type: typeof record['type'] === 'string' ? record['type'] : null,
    category: str(record, 'category') || 'Other',
    totalIntegrationSeconds: num(record, 'totalIntegrationSeconds'),
    lightFrameCount: num(record, 'lightFrameCount'),
    nightCount: num(record, 'nightCount'),
    firstLight: str(record, 'firstLight'),
    latestSession: str(record, 'latestSession'),
    filters: Array.isArray(record['filters'])
      ? (record['filters'] as unknown[]).map((f) => {
          const fr = asRecord(f, `objects[${index}].filters`);
          return {
            name: str(fr, 'name'),
            seconds: num(fr, 'seconds'),
            frames: num(fr, 'frames'),
          };
        })
      : [],
    equipmentIds: Array.isArray(record['equipmentIds'])
      ? (record['equipmentIds'] as unknown[]).map((e) => String(e))
      : [],
    sessions: [],
    image: typeof record['image'] === 'string' ? record['image'] : null,
  };
}

/** Validate one equipment entry into a typed shape. */
function validateEquipment(value: unknown, index: number): EquipmentItem {
  const record = asRecord(value, `equipment[${index}]`);
  return {
    id: str(record, 'id'),
    kind: str(record, 'kind'),
    displayName: str(record, 'displayName'),
    focalLengthMm:
      typeof record['focalLengthMm'] === 'number'
        ? record['focalLengthMm']
        : null,
    fRatio: typeof record['fRatio'] === 'number' ? record['fRatio'] : null,
    totalIntegrationSeconds: num(record, 'totalIntegrationSeconds'),
    lightFrameCount: num(record, 'lightFrameCount'),
    objectCount: num(record, 'objectCount'),
    firstLight: str(record, 'firstLight'),
    latestSession: str(record, 'latestSession'),
    objectIds: Array.isArray(record['objectIds'])
      ? (record['objectIds'] as unknown[]).map((o) => String(o))
      : [],
  };
}

/** Validate the summary block into a typed shape. */
function validateSummary(value: unknown): Summary {
  const record = asRecord(value, 'summary');
  return {
    totalIntegrationSeconds: num(record, 'totalIntegrationSeconds'),
    objectCount: num(record, 'objectCount'),
    nightCount: num(record, 'nightCount'),
    lightFrameCount: num(record, 'lightFrameCount'),
    firstLight: str(record, 'firstLight'),
    latestSession: str(record, 'latestSession'),
    duplicateFileCount: num(record, 'duplicateFileCount'),
    duplicateWastedBytes: num(record, 'duplicateWastedBytes'),
    filters: Array.isArray(record['filters'])
      ? (record['filters'] as unknown[]).map((f) => {
          const fr = asRecord(f, 'summary.filters');
          return { name: str(fr, 'name'), seconds: num(fr, 'seconds') };
        })
      : [],
    byCategory: Array.isArray(record['byCategory'])
      ? (record['byCategory'] as unknown[]).map((c) => {
          const cr = asRecord(c, 'summary.byCategory');
          return {
            category: str(cr, 'category'),
            objectCount: num(cr, 'objectCount'),
            integrationSeconds: num(cr, 'integrationSeconds'),
            lightFrameCount: num(cr, 'lightFrameCount'),
          };
        })
      : [],
    activity: Array.isArray(record['activity'])
      ? (record['activity'] as unknown[]).map((a) => {
          const ar = asRecord(a, 'summary.activity');
          return {
            date: str(ar, 'date'),
            integrationSeconds: num(ar, 'integrationSeconds'),
            lightFrameCount: num(ar, 'lightFrameCount'),
            objectIds: Array.isArray(ar['objectIds'])
              ? (ar['objectIds'] as unknown[]).map((o) => String(o))
              : [],
          };
        })
      : [],
  };
}

/**
 * Strictly validate a parsed request body as a schema-v1 Ledger. Throws
 * LedgerValidationError on any structural breach or unsupported version.
 */
export function validateLedger(raw: unknown): Ledger {
  const root = asRecord(raw, 'ledger');

  const schemaVersion = root['schemaVersion'];
  if (schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new LedgerValidationError(
      `Unsupported schemaVersion. Expected ${SUPPORTED_SCHEMA_VERSION}.`,
      { received: schemaVersion },
    );
  }

  const objectsRaw = asArray(root['objects'], 'objects');
  if (objectsRaw.length > MAX_OBJECTS) {
    throw new LedgerValidationError(`Too many objects (max ${MAX_OBJECTS}).`);
  }

  const equipmentRaw = asArray(root['equipment'], 'equipment');
  if (equipmentRaw.length > MAX_EQUIPMENT) {
    throw new LedgerValidationError(
      `Too much equipment (max ${MAX_EQUIPMENT}).`,
    );
  }

  const toolRecord = asRecord(root['tool'] ?? {}, 'tool');

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    generatedAt: str(root, 'generatedAt'),
    tool: {
      name: str(toolRecord, 'name'),
      version: str(toolRecord, 'version'),
    },
    summary: validateSummary(root['summary']),
    equipment: equipmentRaw.map(validateEquipment),
    objects: objectsRaw.map(validateObject),
    duplicates: [],
    skipped: [],
  };
}
