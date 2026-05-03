import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AnalyticsService } from './analytics.service';

type GtagFunction = (
  command: string,
  action: string,
  params?: Record<string, unknown>
) => void;

/**
 * Google Analytics 4 (GA4) implementation of {@link AnalyticsService}.
 *
 * Assumes the GA4 script is already loaded in the host page (e.g., via index.html).
 * Gracefully degrades if `gtag` is unavailable (ad-blocker, SSR, test environment).
 * All errors from gtag are caught and logged — tracking failures never propagate to callers.
 *
 * To switch analytics providers, create a new class implementing {@link AnalyticsService}
 * and update the `ANALYTICS_SERVICE_TOKEN` provider in each app's `app.config.ts`.
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
    return typeof possibleGtag === 'function'
      ? (possibleGtag as GtagFunction)
      : undefined;
  }

  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    try {
      const gtag = this.getGtag();
      if (!gtag) {
        console.warn(`[Analytics] gtag unavailable; event '${eventName}' not sent.`);
        return;
      }
      gtag('event', eventName, params);
    } catch (error) {
      console.error(`[Analytics] Failed to send event '${eventName}':`, error);
    }
  }

  trackImageGeneration(userId: string, toolsUsed: string): void {
    this.trackEvent('image_generation', { user_id: userId, tools_used: toolsUsed });
  }

  trackVideoGeneration(userId: string, format: string): void {
    this.trackEvent('video_generation', { user_id: userId, format });
  }

  trackPlateSolveInitiated(fileSize: number, hasHints: boolean): void {
    this.trackEvent('plate_solve_initiated', { file_size: fileSize, has_hints: hasHints });
  }

  trackPlateSolveFailed(errorReason: string): void {
    this.trackEvent('plate_solve_failed', { error_reason: errorReason });
  }

  trackAstrosolveBackendCall(endpoint: string, responseTimeMs: number, statusCode: number): void {
    this.trackEvent('astrosolve_backend_call', {
      endpoint,
      response_time_ms: responseTimeMs,
      status_code: statusCode,
    });
  }

  trackCardExportInitiated(format: string): void {
    this.trackEvent('card_export_initiated', { format });
  }

  trackCardExportSuccess(format: string, fileSizeKb: number, timeToGenerateMs: number): void {
    this.trackEvent('card_export_success', {
      format,
      file_size_kb: fileSizeKb,
      time_to_generate_ms: timeToGenerateMs,
    });
  }

  trackCardExportFailed(errorReason: string): void {
    this.trackEvent('card_export_failed', { error_reason: errorReason });
  }

  trackAccessKeyModalOpened(reason: 'first_time' | 'missing' | 'expired'): void {
    this.trackEvent('access_key_modal_opened', { reason });
  }

  trackAccessKeySubmitted(success: boolean): void {
    this.trackEvent('access_key_submitted', { success });
  }

  trackButtonClicked(buttonId: string, section: string): void {
    this.trackEvent('button_clicked', { button_id: buttonId, section });
  }

  trackSettingChanged(settingName: string, newValue: unknown): void {
    this.trackEvent('setting_changed', { setting_name: settingName, new_value: String(newValue) });
  }

  trackRecordingStarted(canvasWidth: number, canvasHeight: number): void {
    this.trackEvent('recording_started', { canvas_width: canvasWidth, canvas_height: canvasHeight });
  }

  trackRecordingStopped(durationSeconds: number, frameCount: number): void {
    this.trackEvent('recording_stopped', { duration_seconds: durationSeconds, frame_count: frameCount });
  }

  trackRecordingPaused(durationSoFarSeconds: number): void {
    this.trackEvent('recording_paused', { duration_so_far_seconds: durationSoFarSeconds });
  }

  trackRecordingResumed(): void {
    this.trackEvent('recording_resumed');
  }

  trackVideoExportInitiated(format: string): void {
    this.trackEvent('video_export_initiated', { format });
  }

  trackVideoExportSuccess(format: string, fileSizeMb: number, durationSeconds: number): void {
    this.trackEvent('video_export_success', {
      format,
      file_size_mb: fileSizeMb,
      duration_seconds: durationSeconds,
    });
  }

  trackVideoExportFailed(errorReason: string): void {
    this.trackEvent('video_export_failed', { error_reason: errorReason });
  }

  trackControlClicked(buttonName: string): void {
    this.trackEvent('control_clicked', { button_name: buttonName });
  }

  trackParameterChanged(paramName: string, newValue: unknown): void {
    this.trackEvent('parameter_changed', { param_name: paramName, new_value: String(newValue) });
  }

  trackRecordingFailed(errorReason: string): void {
    this.trackEvent('recording_failed', { error_reason: errorReason });
  }

  trackMimeTypeUnsupported(browserType: string, fallbackFormat: string): void {
    this.trackEvent('mime_type_unsupported', { browser_type: browserType, fallback_format: fallbackFormat });
  }
}
