/**
 * A finished recording retained in memory after the automatic download, so
 * the user can re-save (or share) it if the browser's download failed —
 * JavaScript gets no success/failure feedback from anchor downloads, making
 * user-driven retry the only universal recovery.
 */
export interface RecordingResult {
  /** The assembled video data. */
  blob: Blob;
  /** Download filename (carries aspect ratio + resolution + extension). */
  filename: string;
  /** Container/codec MIME type the recording was encoded with. */
  mimeType: string;
  /** File size in megabytes (10^6 bytes), rounded for display. */
  sizeMb: number;
}
