/** One caption's span, in global frame numbers across the whole capture. */
export interface CaptionRecord {
  id: string;
  start: number;
  end: number;
}

/** One captured clip and where it sits in the global frame timeline. */
export interface ClipRecord {
  id: string;
  file: string;
  start: number;
  frames: number;
}

/** A rectangle in finished-frame pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A span during which one region of the screen is the subject. */
export interface FocusRecord {
  start: number;
  end: number;
  rect: Rect;
}

/** What a capture writes to `out/<app>/<format>/beats.json`. */
export interface CaptureManifest {
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  clips: ClipRecord[];
  captions: CaptionRecord[];
  /** Absent in manifests written before the focus track existed. */
  focuses?: FocusRecord[];
  /** Astrogram only: where the stellar map's solve came from; "placeholder" takes get stamped. */
  solveSource?: "recorded" | "placeholder";
  /** Astrogram only: the card's header bar, which the captions sit on. */
  cardHeader?: Rect;
}
