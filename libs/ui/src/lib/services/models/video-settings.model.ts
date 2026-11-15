/**
 * The settings a video was made with, sent alongside the video analytics event. Text values only,
 * so each one reads cleanly as a GA4 custom dimension (for example `mode: '3d'`, `rotation: 'off'`).
 */
export type VideoSettings = Readonly<Record<string, string>>;
