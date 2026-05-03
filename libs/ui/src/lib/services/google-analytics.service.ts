import { AnalyticsService } from "./analytics.service";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Google Analytics 4 (GA4) implementation of the AnalyticsService.
 * Initializes gtag.js and provides methods to track custom events.
 *
 * **Configuration:**
 * Set the GA4 Measurement ID via the `GA4_MEASUREMENT_ID` environment variable.
 * The gtag.js script is loaded asynchronously and will queue events until ready.
 */
export class GoogleAnalyticsService implements AnalyticsService {
  private readonly measurementId: string;
  private isInitialized = false;

  constructor() {
    // Load measurement ID from environment
    this.measurementId = (window as any)["__GA4_MEASUREMENT_ID__"] || "";

    if (!this.measurementId) {
      console.warn(
        "GA4 Measurement ID not configured. Analytics events will not be tracked.",
      );
      return;
    }

    this.initializeGtag();
  }

  /**
   * Initialize gtag.js and load the Google Analytics script.
   * Events are automatically queued by gtag.js if the script is still loading.
   */
  private initializeGtag(): void {
    // Create dataLayer if it doesn't exist
    window["dataLayer"] = window["dataLayer"] || [];

    // Define gtag function
    window.gtag = function (...args: any[]): void {
      window["dataLayer"]!.push(arguments);
    };

    // Initialize gtag config
    window.gtag("js", new Date());
    window.gtag("config", this.measurementId, {
      anonymize_ip: true,
    });

    // Load the GA4 script asynchronously
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    script.onload = () => {
      this.isInitialized = true;
    };
    script.onerror = () => {
      console.warn("Failed to load GA4 script");
    };

    document.head.appendChild(script);
  }

  /**
   * Track a custom analytics event.
   * Gracefully handles the case where gtag is not yet initialized.
   */
  trackEvent(eventName: string, params?: Record<string, any>): void {
    if (!window.gtag) {
      console.debug(
        `Analytics event queued (gtag not ready): ${eventName}`,
        params,
      );
      return;
    }

    try {
      window.gtag("event", eventName, {
        ...params,
      });
    } catch (error) {
      console.error(`Failed to track analytics event: ${eventName}`, error);
    }
  }

  /**
   * Track image generation in Astrogram.
   * Logs a custom event with userId and tools used.
   */
  trackImageGeneration(userId: string, toolsUsed: string): void {
    this.trackEvent("image_generation", {
      user_id: userId,
      tools_used: toolsUsed,
    });
  }

  /**
   * Track video generation in Starwizz.
   * Logs a custom event with userId and video format.
   */
  trackVideoGeneration(userId: string, format: string): void {
    this.trackEvent("video_generation", {
      user_id: userId,
      video_format: format,
    });
  }
}
