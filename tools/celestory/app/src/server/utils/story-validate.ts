import { StoryValidationError } from './celestory.error';
import {
  MAX_ALIASES,
  MAX_DATE_LENGTH,
  MAX_EQUIPMENT,
  MAX_FILTER_NAME_LENGTH,
  MAX_ID_LENGTH,
  MAX_IMAGE_REF_LENGTH,
  MAX_NAME_LENGTH,
  MAX_OBSERVER_LENGTH,
  MAX_TARGETS,
  MAX_TOOL_FIELD_LENGTH,
  SUPPORTED_SCHEMA_VERSION,
} from './story.constants';
import type {
  EquipmentItem,
  FilterIntegration,
  Story,
  TargetTimeline,
  Session,
  Summary,
} from './story.types';

/** Narrow an unknown value to a plain object, or throw. */
function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new StoryValidationError(`Expected "${field}" to be an object.`);
  }
  return value as Record<string, unknown>;
}

/** Narrow an unknown value to an array, or throw. */
function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new StoryValidationError(`Expected "${field}" to be an array.`);
  }
  return value;
}

/** Read a finite number from a record field, defaulting to 0. */
function num(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Throw when a string is longer than `max` characters (`path` names it in the error). */
function assertLength(value: string, max: number, path: string): string {
  if (value.length > max) {
    throw new StoryValidationError(`"${path}" is longer than ${max} characters.`);
  }
  return value;
}

/** Read a string from a record field (defaulting to ''), rejecting it when over `max` chars. */
function str(record: Record<string, unknown>, field: string, max: number, path: string): string {
  const value = record[field];
  return typeof value === 'string' ? assertLength(value, max, `${path}.${field}`) : '';
}

/** Read a list of id references (stringified), rejecting any id over the id limit. */
function idList(value: unknown, path: string): string[] {
  return Array.isArray(value)
    ? (value as unknown[]).map((id) => assertLength(String(id), MAX_ID_LENGTH, path))
    : [];
}

/** Validate a list of per-filter integration entries into a typed shape. */
function validateFilters(value: unknown, field: string): FilterIntegration[] {
  return Array.isArray(value)
    ? (value as unknown[]).map((f) => {
        const fr = asRecord(f, field);
        return {
          name: str(fr, 'name', MAX_FILTER_NAME_LENGTH, field),
          seconds: num(fr, 'seconds'),
          frames: num(fr, 'frames'),
        };
      })
    : [];
}

/** Validate one per-night session into a typed shape. */
function validateSession(value: unknown, field: string): Session {
  const record = asRecord(value, field);
  return {
    date: str(record, 'date', MAX_DATE_LENGTH, field),
    integrationSeconds: num(record, 'integrationSeconds'),
    lightFrameCount: num(record, 'lightFrameCount'),
    filters: validateFilters(record['filters'], `${field}.filters`),
    equipmentIds: idList(record['equipmentIds'], `${field}.equipmentIds`),
    focalLengthMm:
      typeof record['focalLengthMm'] === 'number' ? record['focalLengthMm'] : null,
    fRatio: typeof record['fRatio'] === 'number' ? record['fRatio'] : null,
  };
}

/** Validate a target's aliases: at most MAX_ALIASES, each within the name limit. */
function validateAliases(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length > MAX_ALIASES) {
    throw new StoryValidationError(`"${field}" has more than ${MAX_ALIASES} entries.`);
  }
  return (value as unknown[]).map((a) => assertLength(String(a), MAX_NAME_LENGTH, field));
}

/** Validate one target timeline entry into a typed shape. */
function validateTarget(value: unknown, index: number): TargetTimeline {
  const path = `targets[${index}]`;
  const record = asRecord(value, path);
  const id = str(record, 'id', MAX_ID_LENGTH, path);
  if (!id) {
    throw new StoryValidationError(`${path} is missing "id".`);
  }
  return {
    id,
    displayName: str(record, 'displayName', MAX_NAME_LENGTH, path),
    designation: str(record, 'designation', MAX_NAME_LENGTH, path),
    aliases: validateAliases(record['aliases'], `${path}.aliases`),
    type:
      typeof record['type'] === 'string'
        ? assertLength(record['type'], MAX_NAME_LENGTH, `${path}.type`)
        : null,
    category: str(record, 'category', MAX_NAME_LENGTH, path) || 'Other',
    totalIntegrationSeconds: num(record, 'totalIntegrationSeconds'),
    lightFrameCount: num(record, 'lightFrameCount'),
    nightCount: num(record, 'nightCount'),
    firstLight: str(record, 'firstLight', MAX_DATE_LENGTH, path),
    latestSession: str(record, 'latestSession', MAX_DATE_LENGTH, path),
    filters: validateFilters(record['filters'], `${path}.filters`),
    equipmentIds: idList(record['equipmentIds'], `${path}.equipmentIds`),
    sessions: Array.isArray(record['sessions'])
      ? (record['sessions'] as unknown[]).map((s) => validateSession(s, `${path}.sessions`))
      : [],
    image:
      typeof record['image'] === 'string'
        ? assertLength(record['image'], MAX_IMAGE_REF_LENGTH, `${path}.image`)
        : null,
  };
}

/** Validate one equipment entry into a typed shape. */
function validateEquipment(value: unknown, index: number): EquipmentItem {
  const path = `equipment[${index}]`;
  const record = asRecord(value, path);
  return {
    id: str(record, 'id', MAX_ID_LENGTH, path),
    kind: str(record, 'kind', MAX_NAME_LENGTH, path),
    subtype: str(record, 'subtype', MAX_NAME_LENGTH, path),
    displayName: str(record, 'displayName', MAX_NAME_LENGTH, path),
    focalLengthMm:
      typeof record['focalLengthMm'] === 'number'
        ? record['focalLengthMm']
        : null,
    fRatio: typeof record['fRatio'] === 'number' ? record['fRatio'] : null,
    totalIntegrationSeconds: num(record, 'totalIntegrationSeconds'),
    lightFrameCount: num(record, 'lightFrameCount'),
    targetCount: num(record, 'targetCount'),
    firstLight: str(record, 'firstLight', MAX_DATE_LENGTH, path),
    latestSession: str(record, 'latestSession', MAX_DATE_LENGTH, path),
    targetIds: idList(record['targetIds'], `${path}.targetIds`),
  };
}

/** Validate the summary block into a typed shape. */
function validateSummary(value: unknown): Summary {
  const record = asRecord(value, 'summary');
  return {
    totalIntegrationSeconds: num(record, 'totalIntegrationSeconds'),
    targetCount: num(record, 'targetCount'),
    nightCount: num(record, 'nightCount'),
    lightFrameCount: num(record, 'lightFrameCount'),
    firstLight: str(record, 'firstLight', MAX_DATE_LENGTH, 'summary'),
    latestSession: str(record, 'latestSession', MAX_DATE_LENGTH, 'summary'),
    duplicateFileCount: num(record, 'duplicateFileCount'),
    duplicateWastedBytes: num(record, 'duplicateWastedBytes'),
    filters: Array.isArray(record['filters'])
      ? (record['filters'] as unknown[]).map((f) => {
          const fr = asRecord(f, 'summary.filters');
          return {
            name: str(fr, 'name', MAX_FILTER_NAME_LENGTH, 'summary.filters'),
            seconds: num(fr, 'seconds'),
          };
        })
      : [],
    byCategory: Array.isArray(record['byCategory'])
      ? (record['byCategory'] as unknown[]).map((c) => {
          const cr = asRecord(c, 'summary.byCategory');
          return {
            category: str(cr, 'category', MAX_NAME_LENGTH, 'summary.byCategory'),
            targetCount: num(cr, 'targetCount'),
            integrationSeconds: num(cr, 'integrationSeconds'),
            lightFrameCount: num(cr, 'lightFrameCount'),
          };
        })
      : [],
    activity: Array.isArray(record['activity'])
      ? (record['activity'] as unknown[]).map((a) => {
          const ar = asRecord(a, 'summary.activity');
          return {
            date: str(ar, 'date', MAX_DATE_LENGTH, 'summary.activity'),
            integrationSeconds: num(ar, 'integrationSeconds'),
            lightFrameCount: num(ar, 'lightFrameCount'),
            targetIds: idList(ar['targetIds'], 'summary.activity.targetIds'),
          };
        })
      : [],
  };
}

/**
 * Strictly validate a parsed request body as a schema-v3 Story. Throws
 * StoryValidationError on any structural breach, unsupported version, or text
 * field longer than its limit. The free-text `observer`/`site` lines are
 * length-checked here too: they're stored and shown on the public profile even
 * though they aren't part of the typed Story.
 */
export function validateStory(raw: unknown): Story {
  const root = asRecord(raw, 'story');

  const schemaVersion = root['schemaVersion'];
  if (schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new StoryValidationError(
      `Unsupported schemaVersion. Expected ${SUPPORTED_SCHEMA_VERSION}.`,
      { received: schemaVersion },
    );
  }

  const targetsRaw = asArray(root['targets'], 'targets');
  if (targetsRaw.length > MAX_TARGETS) {
    throw new StoryValidationError(`Too many targets (max ${MAX_TARGETS}).`);
  }

  const equipmentRaw = asArray(root['equipment'], 'equipment');
  if (equipmentRaw.length > MAX_EQUIPMENT) {
    throw new StoryValidationError(
      `Too much equipment (max ${MAX_EQUIPMENT}).`,
    );
  }

  str(root, 'observer', MAX_OBSERVER_LENGTH, 'story');
  str(root, 'site', MAX_OBSERVER_LENGTH, 'story');

  const toolRecord = asRecord(root['tool'] ?? {}, 'tool');

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    generatedAt: str(root, 'generatedAt', MAX_DATE_LENGTH, 'story'),
    installId: str(root, 'installId', MAX_ID_LENGTH, 'story'),
    dataFingerprint: str(root, 'dataFingerprint', MAX_ID_LENGTH, 'story'),
    tool: {
      name: str(toolRecord, 'name', MAX_TOOL_FIELD_LENGTH, 'tool'),
      version: str(toolRecord, 'version', MAX_TOOL_FIELD_LENGTH, 'tool'),
    },
    summary: validateSummary(root['summary']),
    equipment: equipmentRaw.map(validateEquipment),
    targets: targetsRaw.map(validateTarget),
    duplicates: [],
    skipped: [],
  };
}
