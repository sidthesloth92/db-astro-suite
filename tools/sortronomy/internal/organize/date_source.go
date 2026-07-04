package organize

// dateSource identifies which timestamp a frame's session date was derived
// from. BuildPlan uses it to warn when it had to fall back to the UTC DATE-OBS
// header, whose date can differ from the observer's local session date.
type dateSource int

const (
	// sourceDateObs means the session date came from the FITS DATE-OBS header
	// (UTC) — the least reliable source for local session grouping and the
	// zero value, so an unset source reads as the fallback.
	sourceDateObs dateSource = iota
	// sourceDateLoc means it came from the FITS DATE-LOC header (local time,
	// written by N.I.N.A.).
	sourceDateLoc
	// sourceFilename means it came from the local capture time decoded from the
	// filename — the preferred source for session grouping.
	sourceFilename
)
