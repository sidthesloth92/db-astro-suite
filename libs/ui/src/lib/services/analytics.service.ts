import { InjectionToken } from "@angular/core";

/**
 * Abstract analytics service defining the contract for tracking user events.
 * Implement this class and provide it via `ANALYTICS_SERVICE_TOKEN` to swap
 * analytics backends (GA4, Mixpanel, etc.) without changing consumers.
 */
export abstract class AnalyticsService {
  /**
   * Track a custom analytics event.
   * @param eventName The name of the event (e.g., 'image_generation', 'video_export')
   * @param params Optional event parameters (dimensions and metrics)
   */
  abstract trackEvent(eventName: string, params?: Record<string, unknown>): void;

  /**
   * Track image generation in Astrogram.
   * @param userId Unique identifier for the user (can be anonymized)
   * @param toolsUsed Comma-separated list of tools/features used
   */
  abstract trackImageGeneration(userId: string, toolsUsed: string): void;

  /**
   * Track video generation in Starwizz.
   * @param userId Unique identifier for the user (can be anonymized)
   * @param format Video format/codec used
   */
  abstract trackVideoGeneration(userId: string, format: string): void;

  // ====================== ASTROGRAM EVENTS ======================

  /**
   * Track plate solve initiation in Astrogram.
   * @param fileSize Size of the image file in bytes
   * @param hasHints Whether manual hints/targets were provided
   */
  abstract trackPlateSolveInitiated(fileSize: number, hasHints: boolean): void;

  /**
   * Track plate solve failure.
   * @param errorReason Description of the error (e.g., 'no_solution', 'timeout', 'invalid_key')
   */
  abstract trackPlateSolveFailed(errorReason: string): void;

  /**
   * Track backend API call to Astrosolve.
   * @param endpoint The API endpoint called (e.g., '/solve', '/status')
   * @param responseTimeMs Response time in milliseconds
   * @param statusCode HTTP status code
   */
  abstract trackAstrosolveBackendCall(
    endpoint: string,
    responseTimeMs: number,
    statusCode: number
  ): void;

  /**
   * Track star map card export initiation.
   * @param format Export format (e.g., 'svg', 'png', 'pdf')
   */
  abstract trackCardExportInitiated(format: string): void;

  /**
   * Track successful star map card export.
   * @param format Export format
   * @param fileSizeKb File size in kilobytes
   * @param timeToGenerateMs Time taken to generate in milliseconds
   */
  abstract trackCardExportSuccess(
    format: string,
    fileSizeKb: number,
    timeToGenerateMs: number
  ): void;

  /**
   * Track star map card export failure.
   * @param errorReason Description of the error
   */
  abstract trackCardExportFailed(errorReason: string): void;

  /**
   * Track access key modal opened.
   * @param reason Why the modal was opened ('first_time', 'missing', or 'expired')
   */
  abstract trackAccessKeyModalOpened(
    reason: "first_time" | "missing" | "expired"
  ): void;

  /**
   * Track access key submission attempt.
   * @param success Whether the key was valid and accepted
   */
  abstract trackAccessKeySubmitted(success: boolean): void;

  /**
   * Track button click in Astrogram.
   * @param buttonId Identifier of the button (e.g., 'save_preset', 'delete_preset', 'edit_annotation')
   * @param section UI section containing the button (e.g., 'equipment', 'annotation')
   */
  abstract trackButtonClicked(buttonId: string, section: string): void;

  /**
   * Track setting changes in Astrogram.
   * @param settingName Name of the setting (e.g., 'title', 'description', 'bortle_scale')
   * @param newValue The new value of the setting
   */
  abstract trackSettingChanged(settingName: string, newValue: unknown): void;

  // ====================== STARWIZZ EVENTS ======================

  /**
   * Track recording session started.
   * @param canvasWidth Canvas width in pixels
   * @param canvasHeight Canvas height in pixels
   */
  abstract trackRecordingStarted(
    canvasWidth: number,
    canvasHeight: number
  ): void;

  /**
   * Track recording session stopped.
   * @param durationSeconds Total duration recorded in seconds
   * @param frameCount Total frames captured
   */
  abstract trackRecordingStopped(
    durationSeconds: number,
    frameCount: number
  ): void;

  /**
   * Track recording paused.
   * @param durationSoFarSeconds Duration recorded so far in seconds
   */
  abstract trackRecordingPaused(durationSoFarSeconds: number): void;

  /**
   * Track recording resumed from pause.
   */
  abstract trackRecordingResumed(): void;

  /**
   * Track video export initiation.
   * @param format Video format (e.g., 'mp4', 'webm')
   */
  abstract trackVideoExportInitiated(format: string): void;

  /**
   * Track successful video export.
   * @param format Video format
   * @param fileSizeMb File size in megabytes
   * @param durationSeconds Video duration in seconds
   */
  abstract trackVideoExportSuccess(
    format: string,
    fileSizeMb: number,
    durationSeconds: number
  ): void;

  /**
   * Track video export failure.
   * @param errorReason Description of the error
   */
  abstract trackVideoExportFailed(errorReason: string): void;

  /**
   * Track control interaction in Starwizz.
   * @param buttonName Name of the control clicked (e.g., 'play', 'pause', 'zoom_in', 'reset')
   */
  abstract trackControlClicked(buttonName: string): void;

  /**
   * Track parameter changes in Starwizz simulation.
   * @param paramName Name of the parameter (e.g., 'zoom_rate', 'rotation_rate', 'speed')
   * @param newValue The new parameter value
   */
  abstract trackParameterChanged(paramName: string, newValue: unknown): void;

  /**
   * Track recording failure.
   * @param errorReason Description of the error (e.g., 'permission_denied', 'unsupported_format')
   */
  abstract trackRecordingFailed(errorReason: string): void;

  /**
   * Track unsupported video MIME type fallback.
   * @param browserType Type of browser/engine (e.g., 'firefox', 'safari', 'chrome')
   * @param fallbackFormat Fallback format used (e.g., 'webm', 'mp4')
   */
  abstract trackMimeTypeUnsupported(
    browserType: string,
    fallbackFormat: string
  ): void;
}

/**
 * Injection token for `AnalyticsService`.
 * Provide with `useClass: GoogleAnalyticsService` (or another implementation) in `app.config.ts`.
 */
export const ANALYTICS_SERVICE_TOKEN = new InjectionToken<AnalyticsService>(
  "AnalyticsService",
);
