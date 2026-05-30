# Analytics Events

This document lists all Google Analytics 4 (GA4) events emitted by the apps in
this workspace. All apps report to the same GA4 property using Measurement ID
`G-SBXMGWP56E` (loaded via `gtag.js` in each app's `index.html`).

> **Local development:** GA is **disabled on `localhost` / `127.0.0.1` / `*.local`**
> so dev traffic never skews the production property. The `gtag.js` script is not
> even loaded on those hosts. See
> [Local development](#local-development-ga-disabled-by-default) below for how to
> re-enable it for testing.

The event implementations live in
[google-analytics.service.ts](libs/ui/src/lib/services/google-analytics.service.ts),
which is provided to each app via `app.config.ts`.

---

## Astrogram (`tools/astrogram`)

GA bootstrap: [tools/astrogram/src/index.html:105-149](tools/astrogram/src/index.html#L105-L149)
Provider wiring: [tools/astrogram/src/app/app.config.ts:22](tools/astrogram/src/app/app.config.ts#L22)

| Event name                          | Parameters                                        | Triggered when                                                                                        | Emitted from                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `astrogram_plate_solve_initiated`   | `file_size`, `has_hints`                          | User uploads an image and starts a plate solve                                                        | [annotation-controls.ts:385](tools/astrogram/src/app/components/card-form/annotation-controls.ts#L385)                                                                                                            |
| `astrogram_plate_solve_failed`      | `error_reason`                                    | Plate solve attempt fails (incl. invalid access key)                                                  | [annotation-controls.ts:479,490](tools/astrogram/src/app/components/card-form/annotation-controls.ts#L479-L490)                                                                                                   |
| `astrogram_astrosolve_success`      | `user_id`, `tools_used`                           | Plate-solved image / annotated card is generated successfully                                         | [annotation-controls.ts:473](tools/astrogram/src/app/components/card-form/annotation-controls.ts#L473)                                                                                                            |
| `astrogram_astrosolve_backend_call` | `endpoint`, `response_time_ms`, `status_code`     | HTTP call made to the Astrosolve backend (defined, **not currently called** in app code)              | service only                                                                                                                                                                                                      |
| `astrogram_card_export_initiated`   | `format`                                          | User starts exporting the preview card to JPG                                                         | [base-card-preview.ts:214](tools/astrogram/src/app/components/base-card-preview/base-card-preview.ts#L214)                                                                                                        |
| `astrogram_card_export_success`     | `format`, `file_size_kb`, `time_to_generate_ms`   | Card export completes successfully                                                                    | [base-card-preview.ts:291](tools/astrogram/src/app/components/base-card-preview/base-card-preview.ts#L291)                                                                                                        |
| `astrogram_card_export_failed`      | `error_reason`                                    | Card export throws or fails                                                                           | [base-card-preview.ts:294](tools/astrogram/src/app/components/base-card-preview/base-card-preview.ts#L294)                                                                                                        |
| `astrogram_access_key_modal_opened` | `reason` (`first_time` \| `missing` \| `expired`) | Access-key modal is shown to the user                                                                 | [annotation-controls.ts:263](tools/astrogram/src/app/components/card-form/annotation-controls.ts#L263)                                                                                                            |
| `astrogram_access_key_submitted`    | `success` (boolean)                               | User submits the access key (valid or not)                                                            | [access-key-modal.component.ts:86,89](tools/astrogram/src/app/components/card-form/access-key-modal.component.ts#L86-L89)                                                                                         |
| `astrogram_instagram_cta_clicked`   | –                                                 | User clicks the "DM on Instagram" CTA inside the access-key modal                                     | [access-key-modal.component.ts:72](tools/astrogram/src/app/components/card-form/access-key-modal.component.ts#L72)                                                                                                |
| `astrogram_button_clicked`          | `button_id`, `section`                            | Tracked buttons clicked (e.g. `edit_annotation`, `save_preset`, `delete_preset`)                      | [annotation-detail.ts:363](tools/astrogram/src/app/components/card-form/annotation-detail.ts#L363), [equipment-settings.ts:180,194](tools/astrogram/src/app/components/card-form/equipment-settings.ts#L180-L194) |
| `astrogram_setting_changed`         | `setting_name`, `new_value`                       | A tracked setting changes (e.g. Bortle scale, equipment preset)                                       | [bortle-settings.ts:40](tools/astrogram/src/app/components/card-form/bortle-settings.ts#L40), [equipment-settings.ts:181](tools/astrogram/src/app/components/card-form/equipment-settings.ts#L181)                |

---

## Starwizz (`tools/starwizz`)

GA bootstrap: [tools/starwizz/src/index.html:96-140](tools/starwizz/src/index.html#L96-L140)
Provider wiring: [tools/starwizz/src/app/app.config.ts:20](tools/starwizz/src/app/app.config.ts#L20)

> Note: the project folder is `starwizz` (single `e`), not "starwizze".

| Event name                        | Parameters                                   | Triggered when                                                                                  | Emitted from                                                                            |
| --------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `starwizz_video_generation`       | `user_id`, `format`                          | A simulation video is generated                                                                 | [simulation.service.ts:563](tools/starwizz/src/app/services/simulation.service.ts#L563) |
| `starwizz_recording_started`      | `canvas_width`, `canvas_height`              | Canvas recording starts (defined, **not currently called**)                                     | service only                                                                            |
| `starwizz_recording_stopped`      | `duration_seconds`, `frame_count`            | Recording stops (defined, **not currently called**)                                             | service only                                                                            |
| `starwizz_recording_paused`       | `duration_so_far_seconds`                    | Recording paused (defined, **not currently called**)                                            | service only                                                                            |
| `starwizz_recording_resumed`      | –                                            | Paused recording resumed (defined, **not currently called**)                                    | service only                                                                            |
| `starwizz_recording_failed`       | `error_reason`                               | Recording fails (defined, **not currently called**)                                             | service only                                                                            |
| `starwizz_video_export_initiated` | `format`                                     | Video export begins (defined, **not currently called**)                                         | service only                                                                            |
| `starwizz_video_export_success`   | `format`, `file_size_mb`, `duration_seconds` | Video export succeeds (defined, **not currently called**)                                       | service only                                                                            |
| `starwizz_video_export_failed`    | `error_reason`                               | Video export fails (defined, **not currently called**)                                          | service only                                                                            |
| `starwizz_control_clicked`        | `button_name`                                | A simulation control button is clicked (defined, **not currently called**)                      | service only                                                                            |
| `starwizz_parameter_changed`      | `param_name`, `new_value`                    | A simulation parameter changes (defined, **not currently called**)                              | service only                                                                            |
| `starwizz_mime_type_unsupported`  | `browser_type`, `fallback_format`            | Browser doesn't support desired MIME and a fallback is used (defined, **not currently called**) | service only                                                                            |

---

## Hub (`hub`)

GA bootstrap: [hub/index.html:75-119](hub/index.html#L75-L119)
Provider wiring: [hub/src/app/app.config.ts](hub/src/app/app.config.ts)

| Event name                | Parameters                                                                              | Triggered when                                                                                                  | Emitted from                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hub_tool_card_clicked`   | `tool` (`starwizz` \| `astrogram` \| `file-grouper`), `target` (`card` \| `learn_more`) | User clicks a mission card or its LEARN MORE CTA on the home page                                               | [index.page.ts](hub/src/app/pages/index.page.ts)                                                                                                                                                         |
| `hub_launch_tool_clicked` | `tool` (`starwizz` \| `astrogram` \| `file-grouper`), `destination` (the launch href)   | User clicks "Launch Tool" / "Access Repository" on a tool page — this is the **hub → tool conversion event** | [astrogram.page.ts](hub/src/app/pages/tool/astrogram.page.ts), [starwizz.page.ts](hub/src/app/pages/tool/starwizz.page.ts), [file-grouper.page.ts](hub/src/app/pages/tool/file-grouper.page.ts) |

The two events form a simple funnel: home → tool page (`hub_tool_card_clicked`) → tool launch (`hub_launch_tool_clicked`). The file-grouper card on the home page is disabled and has no routerLink, so its card click is not tracked — but its tool page's "Access Repository" link is.

---

## GA4 automatic events (all three apps)

Because every app loads the gtag.js snippet with `gtag('config', 'G-SBXMGWP56E', ...)`, GA4 automatically collects these events on **hub, astrogram, and starwizz** without any per-event code:

| Event             | When it fires                         | Notes                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_view`       | On every Angular router NavigationEnd | Fired by [RouteAnalyticsTracker](libs/ui/src/lib/services/route-analytics.tracker.ts). gtag's auto page_view is disabled via `send_page_view: false` in each app's index.html so the tracker is the single source. Params: `page_location`, `page_title` |
| `session_start`   | First event of a new session          |                                                                                                                                                                                                                                                          |
| `first_visit`     | First-ever visit by a user/device     |                                                                                                                                                                                                                                                          |
| `user_engagement` | After ~10s of foreground engagement   |                                                                                                                                                                                                                                                          |
| `session_end`     | Session timeout (~30 min idle)        |                                                                                                                                                                                                                                                          |

SPA route tracking is wired via `provideRouteAnalytics()` in each app's `app.config.ts` ([hub](hub/src/app/app.config.ts), [astrogram](tools/astrogram/src/app/app.config.ts), [starwizz](tools/starwizz/src/app/app.config.ts)).

Additional events come from GA4 **Enhanced Measurement** (configured at the data stream level — `Admin → Data Streams → Web → Enhanced measurement`). Since all three apps share Measurement ID `G-SBXMGWP56E`, they share the same Enhanced Measurement settings. Each toggle adds the corresponding event:

| Event                                             | Trigger                                                               | Default |
| ------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| `scroll`                                          | First time a user scrolls past 90% of the page                        | On      |
| `click`                                           | Outbound link click (different domain)                                | On      |
| `view_search_results`                             | URL contains a `q`/`search`/`s`/`query`/`keyword` parameter           | On      |
| `file_download`                                   | Click on a link ending in a tracked file extension (pdf, zip, mp4, …) | On      |
| `form_start` / `form_submit`                      | First field interaction / submit on a form                            | On      |
| `video_start`, `video_progress`, `video_complete` | YouTube embeds via the IFrame API                                     | On      |

To confirm what's actually enabled, sign in to GA4 → `Admin → Data Streams → click the web stream → Enhanced measurement`.

---

## Viewing the events in Google Analytics

All three apps report to the same GA4 property (`G-SBXMGWP56E`). To inspect the
events:

1. **Sign in** at <https://analytics.google.com> with the account that owns the
   GA4 property for `G-SBXMGWP56E`.
2. **Pick the right property** from the property selector in the top-left.
   The Measurement ID is visible under _Admin → Data Streams → Web_.

### Local development (GA disabled by default)

To avoid skewing real page-visit data, the `gtag.js` bootstrap in each app's
`index.html` short-circuits on `localhost`, `127.0.0.1`, and any `*.local`
hostname: the GA script is never loaded and `gtag('config', ...)` is never
called, so **no** session, page_view, or custom events are sent during
development. `window.gtag` is still defined, so
[`GoogleAnalyticsService`](libs/ui/src/lib/services/google-analytics.service.ts)
degrades gracefully — calls just push to a `dataLayer` that is never transmitted.

**Re-enable GA locally when you need to test the integration:**

- **Per session:** append `?analytics=on` to the URL — e.g.
  `http://localhost:4200/?analytics=on`. This loads GA for the current page and
  persists the choice in `localStorage` (`ga-debug=on`) so reloads and route
  changes keep it on.
- **From DevTools:** run `localStorage.setItem('ga-debug', 'on')` then reload.
- **Turn it back off:** visit `?analytics=off`, or run
  `localStorage.removeItem('ga-debug')` and reload.

When testing locally, pair this with `&debug_mode=true` and **DebugView** (below)
so your test events are clearly separated from real traffic. Production domains
are unaffected by this guard (they track as normal); `?analytics=off` also works
there as a deliberate opt-out.

### Live / debugging (events as they happen)

3. Open **Reports → Realtime**. You'll see active users and an "Event count by
   Event name" card. Trigger an action in the app and the event should appear
   within ~30 seconds.
4. For verbose, per-parameter debugging use **Admin → DebugView**. This only
   shows traffic from sessions flagged with debug mode. You can enable that by
   either:
   - Installing the [Google Analytics Debugger Chrome extension](https://chromewebstore.google.com/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
     and toggling it on while using the app, or
   - Appending `?debug_mode=true` to the URL (works because gtag respects the
     `debug_mode` config flag if set), or
   - Adding `gtag('config', 'G-SBXMGWP56E', { debug_mode: true });` to the
     `index.html` temporarily.

### Historical (aggregated, 24-48h delay)

5. **Reports → Engagement → Events** — table of every event name with counts.
   Click a row to drill into its parameters.
6. **Explore → Free-form** — build a custom report. Add the _Event name_
   dimension plus any custom parameter dimensions you want
   (e.g. `tools_used`, `error_reason`). Custom parameters only show up here
   after you register them as **custom dimensions** in
   _Admin → Custom definitions → Create custom dimension_, using the parameter
   name (e.g. `error_reason`) and scope _Event_. Until that's done the
   parameters are still captured, but you can only see them in DebugView /
   Realtime, not in standard reports.

### Tips

- GA4 debounces the same event from the same session — don't be alarmed if a
  rapid sequence of identical events is collapsed in Realtime.
- Standard reports lag 24-48 hours; Realtime and DebugView are immediate.
- Ad blockers (uBlock, Brave shields, etc.) block `gtag.js`. The service
  no-ops silently in that case, so missing events from a small fraction of
  users is expected.
