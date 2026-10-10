/**
 * Board registry — the single place that maps a leaderboard board id to its
 * scope-aware query and display configuration. Keeps all board→query mapping on
 * the server so the frontend only ever asks for a board by id and renders.
 */
import {
  scopedEquipment,
  scopedFilters,
  scopedMonths,
  scopedProjects,
  scopedTargets,
  scopedUserFrames,
  scopedUserIntegration,
} from './leaderboards-scoped';
import type { BoardConfig, BoardId } from './leaderboards-board.model';

/** All board ids in the design's display order. */
export const BOARD_IDS: readonly BoardId[] = [
  'hours',
  'frames',
  'project',
  'target',
  'cameras',
  'mounts',
  'telescopes',
  'month',
  'filter',
];

/** The board registry, keyed by id. */
const BOARDS: Readonly<Record<BoardId, BoardConfig>> = {
  hours: {
    id: 'hours',
    unit: 'h',
    transform: 'hours',
    tag: 'none',
    sub: 'none',
    query: (scope, limit) => scopedUserIntegration(scope, limit),
  },
  frames: {
    id: 'frames',
    unit: 'frames',
    transform: 'none',
    tag: 'none',
    sub: 'none',
    query: (scope, limit) => scopedUserFrames(scope, limit),
  },
  project: {
    id: 'project',
    unit: 'h',
    transform: 'hours',
    tag: 'none',
    sub: 'designation',
    query: (scope, limit) => scopedProjects(scope, limit),
  },
  target: {
    id: 'target',
    unit: 'imagers',
    transform: 'none',
    tag: 'category',
    sub: 'none',
    query: (scope, limit) => scopedTargets(scope, limit),
  },
  cameras: {
    id: 'cameras',
    unit: 'rigs',
    transform: 'none',
    tag: 'subtype',
    sub: 'none',
    query: (scope, limit) => scopedEquipment('camera', scope, limit),
  },
  mounts: {
    id: 'mounts',
    unit: 'rigs',
    transform: 'none',
    tag: 'subtype',
    sub: 'none',
    query: (scope, limit) => scopedEquipment('mount', scope, limit),
  },
  telescopes: {
    id: 'telescopes',
    unit: 'rigs',
    transform: 'none',
    tag: 'subtype',
    sub: 'spec',
    query: (scope, limit) => scopedEquipment('telescope', scope, limit),
  },
  month: {
    id: 'month',
    unit: 'h',
    transform: 'hours',
    tag: 'none',
    sub: 'none',
    query: (scope, limit) => scopedMonths(scope, limit),
  },
  filter: {
    id: 'filter',
    unit: 'h',
    transform: 'hours',
    tag: 'palette',
    sub: 'none',
    query: (scope, limit) => scopedFilters(scope, limit),
  },
};

/** Narrow an arbitrary string to a known board id. */
export function isBoardId(value: unknown): value is BoardId {
  return typeof value === 'string' && value in BOARDS;
}

/** Resolve a board id to its config (caller must check isBoardId first). */
export function getBoardConfig(id: BoardId): BoardConfig {
  return BOARDS[id];
}
