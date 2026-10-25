/** Human-readable message for an unknown thrown value. */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
