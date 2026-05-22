import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { AnalyticsService } from "./analytics.service";
import { GtagFunction } from "./models/gtag.model";

/**
 * Google Analytics 4 (GA4) implementation of {@link AnalyticsService}.
 *
 * Assumes the GA4 script is already loaded in the host page (e.g., via index.html).
 * Gracefully degrades if `gtag` is unavailable (ad-blocker, SSR, test environment).
 * All errors from gtag are caught and logged — tracking failures never propagate to callers.
 *
 * To switch analytics providers, create a new class implementing {@link AnalyticsService}
 * and update the `AnalyticsService` provider in each app's `app.config.ts`.
 */
@Injectable()
export class GoogleAnalyticsService implements AnalyticsService {
  private readonly document = inject(DOCUMENT);

  /**
   * Safely resolves the global gtag function via the document's window reference.
   * Returns `undefined` in SSR environments or when gtag is blocked/unavailable.
   */
  private getGtag(): GtagFunction | undefined {
    const win = this.document.defaultView;
    if (!win) {
      return undefined;
    }
    const possibleGtag = (win as unknown as { gtag?: unknown }).gtag;
    return typeof possibleGtag === "function"
      ? (possibleGtag as GtagFunction)
      : undefined;
  }

  /**
   * Sends a custom event to Google Analytics 4 via the global `gtag` function.
   * Gracefully no-ops if `gtag` is unavailable or throws.
   *
   * @param eventName - The GA4 event name to send.
   * @param params - Optional event parameters as key-value pairs.
   */
  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    try {
      const gtag = this.getGtag();
      if (!gtag) {
        return;
      }
      gtag("event", eventName, params);
    } catch {
      // Tracking failures must never propagate to callers
    }
  }

  /**
   * Tracks an image generation action by a user.
   *
   * @param userId - The identifier of the user who generated the image.
   * @param toolsUsed - A string describing the tools applied during generation.
   */
  trackImageGeneration(userId: string, toolsUsed: string): void {
    this.trackEvent("astrogram_astrosolve_success", {
      user_id: userId,
      tools_used: toolsUsed,
    });
  }

  /**
   * Tracks a video generation action by a user.
   *
   * @param userId - The identifier of the user who generated the video.
   * @param format - The output format of the generated video.
   */
  trackVideoGeneration(userId: string, format: string): void {
    this.trackEvent("starwizz_video_generation", { user_id: userId, format });
  }

  /**
   * Tracks the initiation of a plate-solve operation.
   *
   * @param fileSize - The size of the uploaded file in bytes.
   * @param hasHints - Whether the user provided coordinate hints to aid solving.
   */
  trackPlateSolveInitiated(fileSize: number, hasHints: boolean): void {
    this.trackEvent("astrogram_plate_solve_initiated", {
      file_size: fileSize,
      has_hints: hasHints,
    });
  }

  /**
   * Tracks a failed plate-solve attempt.
   *
   * @param errorReason - A short description of why the plate solve failed.
   */
  trackPlateSolveFailed(errorReason: string): void {
    this.trackEvent("astrogram_plate_solve_failed", {
      error_reason: errorReason,
    });
  }

  /**
   * Tracks an HTTP call made to the Astrosolve backend.
   *
   * @param endpoint - The API endpoint path that was called.
   * @param responseTimeMs - The round-trip response time in milliseconds.
   * @param statusCode - The HTTP status code returned by the backend.
   */
  trackAstrosolveBackendCall(
    endpoint: string,
    responseTimeMs: number,
    statusCode: number,
  ): void {
    this.trackEvent("astrogram_astrosolve_backend_call", {
      endpoint,
      response_time_ms: responseTimeMs,
      status_code: statusCode,
    });
  }

  /**
   * Tracks the initiation of a card export operation.
   *
   * @param format - The file format chosen for the export (e.g., `'jpg'`).
   */
  trackCardExportInitiated(format: string): void {
    this.trackEvent("astrogram_card_export_initiated", { format });
  }

  /**
   * Tracks a successful card export.
   *
   * @param format - The file format of the exported card (e.g., `'jpg'`).
   * @param fileSizeKb - The size of the exported file in kilobytes.
   * @param timeToGenerateMs - The time taken to generate the export in milliseconds.
   */
  trackCardExportSuccess(
    format: string,
    fileSizeKb: number,
    timeToGenerateMs: number,
  ): void {
    this.trackEvent("astrogram_card_export_success", {
      format,
      file_size_kb: fileSizeKb,
      time_to_generate_ms: timeToGenerateMs,
    });
  }

  /**
   * Tracks a failed card export attempt.
   *
   * @param errorReason - A short description of why the export failed.
   */
  trackCardExportFailed(errorReason: string): void {
    this.trackEvent("astrogram_card_export_failed", {
      error_reason: errorReason,
    });
  }

  /**
   * Tracks the opening of the access key modal.
   *
   * @param reason - The reason the modal was opened: first visit, missing key, or expired key.
   */
  trackAccessKeyModalOpened(
    reason: "first_time" | "missing" | "expired",
  ): void {
    this.trackEvent("astrogram_access_key_modal_opened", { reason });
  }

  /**
   * Tracks the submission of an access key by the user.
   *
   * @param success - `true` if the submitted key was accepted; `false` otherwise.
   */
  trackAccessKeySubmitted(success: boolean): void {
    this.trackEvent("astrogram_access_key_submitted", { success });
  }

  /**
   * Tracks a click on the "DM on Instagram" CTA in the access-key modal.
   */
  trackInstagramCtaClicked(): void {
    this.trackEvent("astrogram_instagram_cta_clicked");
  }

  /**
   * Tracks a button click interaction.
   *
   * @param buttonId - A unique identifier for the button that was clicked.
   * @param section - The UI section or page area where the button resides.
   */
  trackButtonClicked(buttonId: string, section: string): void {
    this.trackEvent("astrogram_button_clicked", {
      button_id: buttonId,
      section,
    });
  }

  /**
   * Tracks a user-initiated setting change.
   *
   * @param settingName - The name of the setting that was changed.
   * @param newValue - The new value applied to the setting.
   */
  trackSettingChanged(settingName: string, newValue: unknown): void {
    this.trackEvent("astrogram_setting_changed", {
      setting_name: settingName,
      new_value: String(newValue),
    });
  }

  /**
   * Tracks the start of a canvas recording session.
   *
   * @param canvasWidth - The width of the canvas in pixels.
   * @param canvasHeight - The height of the canvas in pixels.
   */
  trackRecordingStarted(canvasWidth: number, canvasHeight: number): void {
    this.trackEvent("starwizz_recording_started", {
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
    });
  }

  /**
   * Tracks the completion of a recording session.
   *
   * @param durationSeconds - Total duration of the recording in seconds.
   * @param frameCount - Total number of frames captured during the recording.
   */
  trackRecordingStopped(durationSeconds: number, frameCount: number): void {
    this.trackEvent("starwizz_recording_stopped", {
      duration_seconds: durationSeconds,
      frame_count: frameCount,
    });
  }

  /**
   * Tracks when a recording session is paused by the user.
   *
   * @param durationSoFarSeconds - The elapsed recording duration in seconds at the point of pause.
   */
  trackRecordingPaused(durationSoFarSeconds: number): void {
    this.trackEvent("starwizz_recording_paused", {
      duration_so_far_seconds: durationSoFarSeconds,
    });
  }

  /**
   * Tracks when a paused recording session is resumed by the user.
   */
  trackRecordingResumed(): void {
    this.trackEvent("starwizz_recording_resumed");
  }

  /**
   * Tracks the initiation of a video export operation.
   *
   * @param format - The file format chosen for the video export.
   */
  trackVideoExportInitiated(format: string): void {
    this.trackEvent("starwizz_video_export_initiated", { format });
  }

  /**
   * Tracks a successful video export.
   *
   * @param format - The file format of the exported video.
   * @param fileSizeMb - The size of the exported video file in megabytes.
   * @param durationSeconds - The duration of the exported video in seconds.
   */
  trackVideoExportSuccess(
    format: string,
    fileSizeMb: number,
    durationSeconds: number,
  ): void {
    this.trackEvent("starwizz_video_export_success", {
      format,
      file_size_mb: fileSizeMb,
      duration_seconds: durationSeconds,
    });
  }

  /**
   * Tracks a failed video export attempt.
   *
   * @param errorReason - A short description of why the video export failed.
   */
  trackVideoExportFailed(errorReason: string): void {
    this.trackEvent("starwizz_video_export_failed", {
      error_reason: errorReason,
    });
  }

  /**
   * Tracks a control button click within the simulation or recording UI.
   *
   * @param buttonName - The name or label of the control button that was clicked.
   */
  trackControlClicked(buttonName: string): void {
    this.trackEvent("starwizz_control_clicked", { button_name: buttonName });
  }

  /**
   * Tracks a change to a simulation or generation parameter.
   *
   * @param paramName - The name of the parameter that was changed.
   * @param newValue - The new value assigned to the parameter.
   */
  trackParameterChanged(paramName: string, newValue: unknown): void {
    this.trackEvent("starwizz_parameter_changed", {
      param_name: paramName,
      new_value: String(newValue),
    });
  }

  /**
   * Tracks a recording failure.
   *
   * @param errorReason - A short description of why the recording failed.
   */
  trackRecordingFailed(errorReason: string): void {
    this.trackEvent("starwizz_recording_failed", { error_reason: errorReason });
  }

  /**
   * Tracks when the browser does not support the desired MIME type and a fallback format is used.
   *
   * @param browserType - A string identifying the browser type or user-agent category.
   * @param fallbackFormat - The fallback MIME type or format that was selected instead.
   */
  trackMimeTypeUnsupported(browserType: string, fallbackFormat: string): void {
    this.trackEvent("starwizz_mime_type_unsupported", {
      browser_type: browserType,
      fallback_format: fallbackFormat,
    });
  }
}
