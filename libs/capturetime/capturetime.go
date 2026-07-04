// Package capturetime decodes when an astrophotography frame was captured and
// which observing night it belongs to.
//
// It is deliberately dependency-free (standard library only) so any tool in the
// suite can reuse it without pulling in FITS or CLI dependencies. Two concerns
// live here — parsing a capture time from a filename or a FITS date header
// (this file) and bucketing that time into an observing-night date (session.go).
//
// Timestamps are returned as wall-clock times with no zone applied: the digits
// are taken verbatim. A filename token stamped by the capture software is the
// observer's LOCAL time; a FITS DATE-OBS value is UTC per the FITS standard.
// The caller decides which interpretation applies.
package capturetime

import (
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// filenameFormat pairs a regexp that locates a timestamp token anywhere in a
// filename with the time layout that parses the matched token.
type filenameFormat struct {
	re     *regexp.Regexp
	layout string
}

// filenameFormats lists the capture-software filename timestamp layouts we
// recognize, ordered most-specific first so a time-bearing match is always
// preferred over a bare date that would otherwise shadow it. Matched tokens are
// local wall-clock time, which is what observing-night grouping needs.
var filenameFormats = []filenameFormat{
	// ASIAIR / compact: 20260701-210029
	{regexp.MustCompile(`\d{8}-\d{6}`), "20060102-150405"},
	// N.I.N.A. $$DATETIME$$: 2026-07-01_21-00-29 and the ISO 'T' variant
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}`), "2006-01-02_15-04-05"},
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}`), "2006-01-02T15-04-05"},
	// SharpCap-style: "2026-07-01 21_00_29" and the fully-underscored variant
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2} \d{2}_\d{2}_\d{2}`), "2006-01-02 15_04_05"},
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2}_\d{2}_\d{2}_\d{2}`), "2006-01-02_15_04_05"},
	// Compact ISO: 20260701T210029
	{regexp.MustCompile(`\d{8}T\d{6}`), "20060102T150405"},
	// N.I.N.A. $$DATEMINUS12$$ (date only, dashed): 2026-07-01
	{regexp.MustCompile(`\d{4}-\d{2}-\d{2}`), "2006-01-02"},
}

// ParseFilenameTimestamp decodes the local capture time embedded in an
// astrophotography filename. It strips the extension, scans the base name for
// the first recognized timestamp token across ASIAIR, N.I.N.A., SharpCap and
// ISO layouts, and returns it as a local wall-clock time. The bool is false
// when no known timestamp is present (or the matched token is not a real date).
func ParseFilenameTimestamp(name string) (time.Time, bool) {
	base := strings.TrimSuffix(filepath.Base(name), filepath.Ext(name))
	for _, f := range filenameFormats {
		tok := f.re.FindString(base)
		if tok == "" {
			continue
		}
		if t, err := time.Parse(f.layout, tok); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// fitsDateLayouts are the timestamp layouts a FITS DATE-OBS / DATE-LOC value may
// use: the ISO standard, common millisecond/microsecond variants, and a
// date-only fallback.
var fitsDateLayouts = []string{
	"2006-01-02T15:04:05.999999",
	"2006-01-02T15:04:05.000",
	"2006-01-02T15:04:05",
	"2006-01-02",
}

// ParseFitsDateTime parses a FITS DATE-OBS or DATE-LOC header value. DATE-OBS is
// UTC per the FITS standard; DATE-LOC (written by N.I.N.A.) is local time. The
// value carries no zone token, so the returned time holds the digits verbatim.
// The bool is false when the value is empty or unrecognized.
func ParseFitsDateTime(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	for _, layout := range fitsDateLayouts {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}
