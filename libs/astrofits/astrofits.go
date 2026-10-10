// Package astrofits is a small, resilient reader for the FITS header metadata
// the db-astro-suite tools need (target, camera, optics, filter, exposure,
// date, frame type, …). It reads headers only — never pixel data — so even
// 100 MB sub-exposures parse fast.
//
// It is the shared parsing core lifted from the Sortronomy organizer so that
// read-only analyzers (AstroLedger) and file-movers (Sortronomy) share one
// implementation. The reader is deliberately tolerant of cross-program header
// variation (NINA, ASIAIR, SharpCap, Ekos, SGP, Voyager, APT, …) and never
// panics on malformed input — unreadable files return an error and callers
// skip them.
package astrofits

import (
	"path/filepath"
	"strings"
)

// IsFITS reports whether name has a .fit / .fits extension and is not a
// dotfile. Callers use this to filter directory walks.
func IsFITS(name string) bool {
	if strings.HasPrefix(filepath.Base(name), ".") {
		return false
	}
	switch strings.ToLower(filepath.Ext(name)) {
	case ".fit", ".fits":
		return true
	}
	return false
}
