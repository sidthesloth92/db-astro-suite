/**
 * Enumerated outcome for a single recorded solve event.
 *
 * One value is written to `solve_events.outcome` per row. The route layer
 * sets the value at the point of decision (e.g. queue-full reject) and the
 * analytics hook infers the value from the response status as a safety net
 * for paths that forget to set it.
 */
export const SolveEventOutcome = Object.freeze({
  SUCCESS: "success",
  SOLVE_FAILED: "solve_failed",
  VALIDATION_ERROR: "validation_error",
  AUTH_FAILED: "auth_failed",
  QUEUE_FULL: "queue_full",
  INTERNAL_ERROR: "internal_error",
});

/**
 * The full set of columns persisted per solve event. Used as the shape for
 * the request-scoped accumulator (`request.analytics`) and for DAO inserts.
 */
export const SOLVE_EVENT_COLUMNS = Object.freeze([
  "request_id",
  "key_id",
  "client_ip",
  "user_agent",
  "browser_name",
  "browser_version",
  "os_name",
  "os_version",
  "device_type",
  "outcome",
  "http_status",
  "response_code",
  "error_message",
  "file_size_bytes",
  "image_width_px",
  "image_height_px",
  "file_extension",
  "ra_hint_deg",
  "dec_hint_deg",
  "queue_depth_on_enqueue",
  "queue_wait_ms",
  "solve_ra_deg",
  "solve_dec_deg",
  "solve_pixel_scale_arcsec_px",
  "solve_field_width_arcmin",
  "solve_field_height_arcmin",
  "solve_field_rotation_deg",
  "solve_match_count",
  "solve_log_odds",
  "solve_index_used",
  "solve_duration_ms",
  "solve_sources_found",
  "local_catalog_count",
  "simbad_count",
  "simbad_available",
  "objects_returned",
  "objects_returned_stars",
  "objects_returned_galaxies",
  "objects_returned_nebulae",
  "objects_returned_clusters",
  "objects_returned_other",
  "objects_returned_from_local",
  "objects_returned_from_simbad",
  "total_duration_ms",
  "diagnostics",
]);
