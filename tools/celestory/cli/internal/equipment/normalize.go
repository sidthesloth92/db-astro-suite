// Package equipment turns the camera/optics fields read from FITS headers into
// stable, listable equipment identities and builds the deduped equipment
// registry (with a reverse index of the objects shot with each item).
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

// OpticDisplay returns a friendly optic name. Prefers the TELESCOP value;
// falls back to a focal-length label; returns "" when neither is known. A
// TELESCOP value recognised as a mount yields no optic (it is surfaced as a
// mount instead) — no unnamed focal-length optic is synthesised for it.
func OpticDisplay(telescope string, focal float64) string {
	telescope = strings.TrimSpace(telescope)
	if isMount(telescope) {
		return ""
	}
	if telescope != "" {
		return telescope
	}
	if focal > 0 {
		return fmt.Sprintf("Unknown optic (%dmm)", int(math.Round(focal)))
	}
	return ""
}

// OpticID returns a stable id like "optic-redcat-51" or "optic-250mm", or ""
// when no optic is known. A TELESCOP value recognised as a mount yields no
// optic id (see OpticDisplay).
func OpticID(telescope string, focal float64) string {
	telescope = strings.TrimSpace(telescope)
	if isMount(telescope) {
		return ""
	}
	if s := slug(telescope); s != "" {
		return "optic-" + s
	}
	if focal > 0 {
		return fmt.Sprintf("optic-%dmm", int(math.Round(focal)))
	}
	return ""
}
