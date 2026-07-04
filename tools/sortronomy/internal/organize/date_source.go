package organize

import "github.com/sidthesloth92/db-astro-suite/libs/capturetime"

// dateSource identifies which timestamp a frame's session date was derived
// from. BuildPlan uses it to warn when it had to fall back to the UTC DATE-OBS
// header, whose date can differ from the observer's local session date. It is
// an alias of the shared capturetime.Source so sessionTimestamp can delegate
// the priority chain to the lib without conversion.
type dateSource = capturetime.Source

const (
	// sourceDateObs means the session date came from the FITS DATE-OBS header
	// (UTC) — the least reliable source for local session grouping and the
	// zero value, so an unset source reads as the fallback.
	sourceDateObs = capturetime.SourceDateObs
	// sourceDateLoc means it came from the FITS DATE-LOC header (local time,
	// written by N.I.N.A.).
	sourceDateLoc = capturetime.SourceDateLoc
	// sourceFilename means it came from the local capture time decoded from the
	// filename — the preferred source for session grouping.
	sourceFilename = capturetime.SourceFilename
)
