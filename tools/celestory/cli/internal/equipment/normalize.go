// Package equipment turns the camera/telescope fields read from FITS headers
// into stable, listable equipment identities and builds the deduped equipment
// registry (with a reverse index of the targets shot with each item).
package equipment

import (
	"fmt"
	"math"
	"regexp"
	"strings"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

var nonAlnumRe = regexp.MustCompile(`[^a-z0-9]+`)

func slug(s string) string {
	return strings.Trim(nonAlnumRe.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

// CameraDisplay returns a friendly camera name from the raw INSTRUME value.
func CameraDisplay(raw string) string {
	return strings.TrimSpace(raw)
}

// CameraID returns a stable id like "cam-2600mm" from a raw INSTRUME value, or
// "" when no camera is known.
func CameraID(raw string) string {
	compact := astrofits.NormalizeCamera(raw)
	if compact == "" {
		compact = slug(raw)
	}
	if compact == "" {
		return ""
	}
	return "cam-" + strings.ToLower(compact)
}

// TelescopeDisplay returns a friendly telescope name. Prefers the TELESCOP
// value; falls back to a focal-length label; returns "" when neither is known.
// A TELESCOP value recognised as a mount yields no telescope (it is surfaced as
// a mount instead) — no unnamed focal-length telescope is synthesised for it.
func TelescopeDisplay(telescope string, focal float64) string {
	telescope = strings.TrimSpace(telescope)
	if isMount(telescope) {
		return ""
	}
	if telescope != "" {
		return telescope
	}
	if focal > 0 {
		return fmt.Sprintf("Unknown telescope (%dmm)", int(math.Round(focal)))
	}
	return ""
}

// TelescopeID returns a stable id like "telescope-redcat-51" or
// "telescope-250mm", or "" when no telescope is known. A TELESCOP value
// recognised as a mount yields no telescope id (see TelescopeDisplay).
func TelescopeID(telescope string, focal float64) string {
	telescope = strings.TrimSpace(telescope)
	if isMount(telescope) {
		return ""
	}
	if s := slug(telescope); s != "" {
		return "telescope-" + s
	}
	if focal > 0 {
		return fmt.Sprintf("telescope-%dmm", int(math.Round(focal)))
	}
	return ""
}
