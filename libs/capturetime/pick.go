package capturetime

import "time"

// Source identifies which timestamp PickSessionTime derived a frame's session
// time from, so callers can warn when the least reliable source was used.
type Source int

const (
	// SourceDateObs means the session time came from the FITS DATE-OBS header
	// (UTC) — the least reliable source for local session grouping and the
	// zero value, so an unset source reads as the fallback.
	SourceDateObs Source = iota
	// SourceDateLoc means it came from the FITS DATE-LOC header (local time,
	// written by N.I.N.A.).
	SourceDateLoc
	// SourceFilename means it came from the local capture time decoded from the
	// filename — the preferred source for session grouping.
	SourceFilename
)

// PickSessionTime picks the timestamp used to compute a frame's session date.
//
// Session grouping must be compared against the observer's LOCAL clock, so the
// priority is: (1) the local capture time decoded from the filename, (2) the
// DATE-LOC header (local time, written by N.I.N.A.), (3) DATE-OBS (UTC) as a
// last resort. The returned Source lets callers warn when they land on
// DATE-OBS. A full path is accepted — only the base name is scanned.
func PickSessionTime(filename string, dateLoc, dateObs time.Time) (time.Time, Source) {
	if ft, ok := ParseFilenameTimestamp(filename); ok && datesPlausible(ft, dateObs) {
		return ft, SourceFilename
	}
	if !dateLoc.IsZero() {
		return dateLoc, SourceDateLoc
	}
	return dateObs, SourceDateObs
}

// datesPlausible reports whether a filename-decoded local time is close enough to
// DATE-OBS to trust for session grouping. A real UTC offset never shifts the
// calendar day by more than one, so a gap beyond 24h means the filename time is
// bogus (e.g. a batch-renamed file) and must not override the header. A
// date-only filename token (midnight) is always trusted — it is an explicit
// session date (e.g. N.I.N.A. $$DATEMINUS12$$), not a mislabel. A zero DATE-OBS
// leaves nothing to compare against, so the filename wins.
func datesPlausible(filenameTime, dateObs time.Time) bool {
	if dateObs.IsZero() {
		return true
	}
	if filenameTime.Hour() == 0 && filenameTime.Minute() == 0 && filenameTime.Second() == 0 {
		return true
	}
	diff := filenameTime.Sub(dateObs)
	if diff < 0 {
		diff = -diff
	}
	return diff <= 24*time.Hour
}
