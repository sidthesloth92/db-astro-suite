/**
 * Admin: issue a new recovery code for a profile whose owner lost both the
 * password and the code. Prints the code once — send it to the owner, who then
 * uses "Forgot password?" on their profile to choose a new password. You never
 * set or see their password.
 *
 * Verify the requester first. With `--check <celestory.json>` the script
 * compares the file's install id (it stays on the owner's machine and is not
 * shown on the public profile) with the install ids that published this
 * handle, and refuses to issue a code on a mismatch.
 *
 * Usage (from tools/celestory/app):
 *   npx tsx --env-file=.env.local scripts/reset-recovery-code.ts <handle> [--check <celestory.json>]
 */
import { readFileSync } from 'node:fs';
import { getDb } from '../src/server/utils/db';
import { normalizeHandle } from '../src/server/utils/handle';
import { hashPassword } from '../src/server/utils/password';
import { formatRecoveryCode, generateRecoveryCode } from '../src/server/utils/recovery-code.util';

/** Parse `<handle> [--check <file>]` from the command line. */
function parseArgs(argv: string[]): { handle: string; checkFile: string | null } {
  const [rawHandle, flag, file] = argv;
  if (!rawHandle || (flag !== undefined && (flag !== '--check' || !file))) {
    throw new Error('Usage: reset-recovery-code.ts <handle> [--check <celestory.json>]');
  }
  return { handle: normalizeHandle(rawHandle), checkFile: flag ? file : null };
}

/** Read the install id from a celestory.json the requester sent. */
function installIdFromFile(path: string): string {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { installId?: unknown };
  if (typeof parsed.installId !== 'string' || !parsed.installId) {
    throw new Error(`${path} has no installId — it was not produced by the Celestory CLI.`);
  }
  return parsed.installId;
}

async function main(): Promise<void> {
  const { handle, checkFile } = parseArgs(process.argv.slice(2));
  const sql = getDb();

  const found = (await sql`SELECT id FROM stories WHERE handle = ${handle} LIMIT 1`) as Array<{
    id: string;
  }>;
  if (found.length === 0) {
    throw new Error(`No profile @${handle}.`);
  }

  if (checkFile) {
    const installId = installIdFromFile(checkFile);
    const matches = (await sql`
      SELECT COUNT(*)::int AS n FROM story_uploads
      WHERE profile_id = ${handle} AND install_id = ${installId}
    `) as Array<{ n: number }>;
    if (matches[0].n === 0) {
      throw new Error(
        `The install id in ${checkFile} never published @${handle}. Not issuing a code.`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`✓ ${checkFile} comes from an install that published @${handle}.`);
  }

  const code = generateRecoveryCode();
  await sql`UPDATE stories SET recovery_hash = ${await hashPassword(code)} WHERE id = ${found[0].id}`;
  // eslint-disable-next-line no-console
  console.log(`New recovery code for @${handle}: ${formatRecoveryCode(code)}`);
  // eslint-disable-next-line no-console
  console.log('Any earlier code for this profile no longer works.');
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
