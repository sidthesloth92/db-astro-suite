import { SUPPORTED_STORY_SCHEMA_VERSION } from '../models/story.constants';
import type { CelestoryStory } from '../models/story.model';

/** Outcome of reading/validating an uploaded celestory.json file. */
export type ReadStoryResult =
  | { ok: true; story: CelestoryStory }
  | { ok: false; error: string };

/** Generic invalid-file message, shared by every upload entry point. */
const INVALID_FILE_MESSAGE = 'That file isn’t a valid celestory.json export.';

/**
 * Build the message shown when a story's schema version doesn't match what this
 * app renders — almost always an older CLI. Surfaces the producing CLI version
 * when present so the user knows what they ran.
 */
function outdatedSchemaMessage(story: CelestoryStory): string {
  const usedVersion = story.tool?.version ? ` (you used celestory ${story.tool.version})` : '';
  return (
    `This celestory.json was made by an older Celestory CLI${usedVersion}. ` +
    'Update to the latest version and re-scan your library to regenerate it.'
  );
}

/** Parse, shape-check and schema-check a celestory.json string. */
export function parseStoryText(text: string): ReadStoryResult {
  let parsed: CelestoryStory;
  try {
    parsed = JSON.parse(text) as CelestoryStory;
  } catch {
    return { ok: false, error: INVALID_FILE_MESSAGE };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.summary) {
    return { ok: false, error: INVALID_FILE_MESSAGE };
  }
  // Reject storys from an older/newer CLI before rendering, so the user gets a
  // clear "update & regenerate" prompt instead of a broken view.
  if (parsed.schemaVersion != SUPPORTED_STORY_SCHEMA_VERSION) {
    return { ok: false, error: outdatedSchemaMessage(parsed) };
  }
  return { ok: true, story: parsed };
}

/** Read a chosen/dropped File and parse it as a story (browser FileReader). */
export function readStoryFile(file: File): Promise<ReadStoryResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseStoryText(String(reader.result)));
    reader.onerror = () => resolve({ ok: false, error: 'Could not read that file.' });
    reader.readAsText(file);
  });
}
