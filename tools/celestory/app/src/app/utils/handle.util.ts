/** Normalise a user-typed handle for display + claiming (mirrors the server). */
export function slugifyHandle(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9-]+/g, '')
    .slice(0, 30);
}
