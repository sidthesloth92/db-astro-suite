package equipment

import (
	"regexp"
	"strings"
)

// Equipment sub-type classification, derived at extraction time so the web app
// (and the community leaderboards) can render a sub-type tag without re-deriving
// anything in the UI. Each classifier returns a stable lowercase token or "" when
// it cannot decide confidently — a missing tag is always preferred to a wrong one.

// --- cameras: mono / colour / dslr ---

// dslrMakeRe matches consumer-camera makes (and the modded-DSLR "Ra" line); a
// match means the sensor is a colour DSLR/mirrorless body, tagged "dslr".
var dslrMakeRe = regexp.MustCompile(`(?i)\b(canon|nikon|sony|pentax|fuji(film)?|olympus|eos)\b|\bdslr\b`)

// camMonoRe matches the mono naming conventions: ZWO "…MM", QHY "…M", or a
// literal "mono" token. The digit/word boundaries stop it firing on stray text.
var camMonoRe = regexp.MustCompile(`(?i)\bmono\b|\d+\s*mm\b|qhy\s*\d+m\b`)

// camColourRe matches the colour naming conventions: ZWO "…MC", QHY "…C", or a
// literal "colour"/"osc" token.
var camColourRe = regexp.MustCompile(`(?i)\bcolou?r\b|\bosc\b|\d+\s*mc\b|qhy\s*\d+c\b`)

// CameraSubtype classifies a camera from its raw INSTRUME name plus the Bayer
// (one-shot-colour) signal read from the FITS header. Returns "mono", "colour",
// "dslr", or "" when indeterminate. Order matters: a DSLR make wins, then explicit
// mono naming, then the definitive OSC/Bayer signal or explicit colour naming.
func CameraSubtype(rawName string, isOSC bool) string {
	s := strings.ToLower(strings.TrimSpace(rawName))
	if s == "" {
		return ""
	}
	switch {
	case dslrMakeRe.MatchString(s):
		return "dslr"
	case camMonoRe.MatchString(s):
		return "mono"
	case isOSC || camColourRe.MatchString(s):
		return "colour"
	default:
		return ""
	}
}

// --- mounts: harmonic / tracker / equatorial ---

// mountHarmonicRe matches strain-wave (harmonic) drives by model family or token.
var mountHarmonicRe = regexp.MustCompile(`(?i)\bam[135]\b|\brst-?\d+|\bnyx\b|wave\s?1[05]0|rainbow\s*astro|harmonic|strain`)

// mountTrackerRe matches portable star trackers.
var mountTrackerRe = regexp.MustCompile(`(?i)tracker|star\s?adventurer|polarie|skyguider|skytracker|skyhunter|smarteq|move\s*shoot\s*move|benro\s*polaris`)

// MountSubtype classifies a recognised mount as "harmonic", "tracker", or
// "equatorial". Returns "" for a value that is not a mount at all.
func MountSubtype(name string) string {
	if !isMount(name) {
		return ""
	}
	s := strings.ToLower(name)
	switch {
	case mountHarmonicRe.MatchString(s):
		return "harmonic"
	case mountTrackerRe.MatchString(s):
		return "tracker"
	default:
		return "equatorial"
	}
}

// --- telescopes: refractor / sct / newtonian / maksutov / astrograph ---
//
// Optics carry no FITS type keyword — only the free-form TELESCOP string — so
// these are high-confidence keyword matches only; anything ambiguous stays "".

var (
	scopeAstrographRe = regexp.MustCompile(`(?i)\brasa\b|astrograph|hyperstar`)
	scopeMaksutovRe   = regexp.MustCompile(`(?i)\bmak(sutov)?\b|\bmc\s?1\d{2}\b`)
	scopeSctRe        = regexp.MustCompile(`(?i)\bsct\b|edge\s?hd|schmidt|nexstar|\bc(6|8|9\.25|11|14)\b`)
	scopeNewtonianRe  = regexp.MustCompile(`(?i)newton|\bdob(sonian)?\b|reflector|quattro|\d+p(ds)?\b`)
	scopeRefractorRe  = regexp.MustCompile(`(?i)refractor|\bapo\b|apochromat|esprit|redcat|\bfra\d|\bfsq\b|petzval|doublet|triplet|quadruplet|quintuplet|\bed\d{2,3}\b|askar|radian|\bgt\d{2,3}\b|william\s*optics`)
)

// TelescopeSubtype classifies a telescope by its name, high-confidence only.
// Returns "refractor", "sct", "newtonian", "maksutov", "astrograph", or "" when
// the name is a mount or cannot be classified with confidence.
func TelescopeSubtype(name string) string {
	if isMount(name) {
		return ""
	}
	s := strings.ToLower(strings.TrimSpace(name))
	if s == "" {
		return ""
	}
	switch {
	case scopeAstrographRe.MatchString(s):
		return "astrograph"
	case scopeMaksutovRe.MatchString(s):
		return "maksutov"
	case scopeSctRe.MatchString(s):
		return "sct"
	case scopeNewtonianRe.MatchString(s):
		return "newtonian"
	case scopeRefractorRe.MatchString(s):
		return "refractor"
	default:
		return ""
	}
}
