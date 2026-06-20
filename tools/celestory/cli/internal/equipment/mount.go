package equipment

import (
	"regexp"
	"strings"
)

// FITS has no dedicated mount keyword, so a mount can only be recognised by the
// text written into the TELESCOP header (EQMOD/ASCOM setups expose the mount as
// the "Telescope" device). Detection is therefore a name heuristic. The whole
// mount/optic split rests on the coverage of these patterns, so they live here,
// centralised and easy to extend — adding a newly-seen mount is a one-line change.
//
// Matching is asymmetric on purpose: a value becomes a mount ONLY on a positive
// match; everything else stays a telescope/optic (the standard meaning of
// TELESCOP). So a real scope is never demoted to a mount, and the only residual
// miss is an unlisted mount shown as a scope.

// mountSubstrings are distinctive, collision-safe tokens matched anywhere in the
// lowercased telescope string. For brands that make both scopes and mounts
// (Sky-Watcher, Celestron, iOptron, Vixen, Takahashi, Astro-Physics) the bare
// brand name is deliberately absent — those are matched by model family below.
var mountSubstrings = []string{
	"mount",                 // literal "...Mount"; also catches every "Paramount" model
	"eqmod", "eqascom",      // SkyWatcher/Orion EQ ASCOM drivers — the most common ASCOM leak
	"gsserver", "gs server", // Green Swamp Server (harmonic-mount control)
	"onstep",                // OnStep / OnStepX DIY controllers
	"synscan",               // SkyWatcher SynScan hand controller / app
	"ioptron",               // iOptron (mounts only)
	"skyguider", "skyhunter", "skytracker", "smarteq", // iOptron portable trackers
	"star adventurer", "staradventurer", // SkyWatcher trackers (GTi / 2i / Mini)
	"harmonic",         // generic harmonic-drive mount
	"tracker",          // generic star tracker
	"rainbow astro",    // Rainbow Astro (RST harmonic mounts)
	"avalon",           // Avalon Instruments (mounts only)
	"losmandy",         // Losmandy (mounts only)
	"10micron",         // 10Micron (mounts only)
	"nyx",              // Pegasus Astro NYX harmonic mount
	"polarie",          // Vixen Polarie tracker
	"move shoot move",  // MSM trackers
	"benro polaris",    // Benro Polaris tracker
	"wave 100", "wave100", "wave 150", "wave150", // SkyWatcher Wave harmonic mounts
	"cq350", // SkyWatcher CQ350
}

// mountCodeRe matches model-code families at a word start, absorbing any
// attached suffix (so "AM5N" and "Mach2GTO" match). The leading boundary stops
// a code from triggering inside an unrelated word; the ambiguous 3-letter
// iOptron families require a model number so they can't catch e.g. "Gemini".
var mountCodeRe = regexp.MustCompile(`\b(` +
	`eq[356]|neq6|heq5|az-?eq|az-?gti|` + // SkyWatcher German-EQ / alt-az goto
	`am[135]|` + // ZWO AM harmonic (AM3, AM5, AM5N)
	`cem\d+|gem\d+|hem\d+|ieq\d+|hae\d+|` + // iOptron families (always model-numbered)
	`cgx|cge|avx|` + // Celestron (CGX, CGE/CGEM, AVX)
	`rst-?\d+|` + // Rainbow Astro RST-series
	`gm[1-4]000|` + // 10Micron GM-series
	`mach[12]|ap(900|1100|1200|1600)|` + // Astro-Physics (model family, not brand)
	`em-?(11|200|400)|njp` + // Takahashi mounts (not their OTAs)
	`)\w*`)

// isMount reports whether a TELESCOP value names a mount rather than an optic.
func isMount(name string) bool {
	s := strings.ToLower(strings.TrimSpace(name))
	if s == "" {
		return false
	}
	for _, tok := range mountSubstrings {
		if strings.Contains(s, tok) {
			return true
		}
	}
	return mountCodeRe.MatchString(s)
}

// MountID returns a stable id like "mount-eqmod-mount" when the telescope value
// is recognised as a mount, or "" otherwise.
func MountID(name string) string {
	if !isMount(name) {
		return ""
	}
	if s := slug(name); s != "" {
		return "mount-" + s
	}
	return ""
}

// MountDisplay returns the friendly mount name when the telescope value is
// recognised as a mount, or "" otherwise.
func MountDisplay(name string) string {
	if !isMount(name) {
		return ""
	}
	return strings.TrimSpace(name)
}
