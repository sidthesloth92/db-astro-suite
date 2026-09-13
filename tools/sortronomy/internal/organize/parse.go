package organize

import (
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/capturetime"
)

// Tokens are the fields recovered from an ASIAIR-style filename. Any field
// may be empty when the layout doesn't match. Used only as fallback when
// FITS headers are missing the corresponding value.
type Tokens struct {
	FrameType string
	Target    string
	Camera    string
	Filter    string
	DateObs   time.Time
}

var (
	rotationTokenRe = regexp.MustCompile(`^\d+(\.\d+)?deg$`)
	filterSuffixCap = regexp.MustCompile(`(?i)_f_([^_]+)$`)
)

// ParseFilename does a best-effort positional parse of an ASIAIR-style
// filename. It collapses both the old (`_<n>deg_`) and new layouts and
// extracts the same fields the Python scripts pulled from filenames.
//
// Returns an all-empty Tokens when the filename doesn't look like an ASIAIR
// frame name (so caller can detect "fallback didn't help" cleanly).
func ParseFilename(name string) Tokens {
	base := strings.TrimSuffix(name, filepath.Ext(name))

	// Pull the `_f_<filter>` OSC suffix off first, if present. The Python
	// `group_by_date_color.py` script writes it; this fallback recognizes it.
	var osc string
	if m := filterSuffixCap.FindStringSubmatch(base); m != nil {
		osc = m[1]
		base = filterSuffixCap.ReplaceAllString(base, "")
	}

	parts := strings.Split(base, "_")

	// Drop the rotation token (`<n>deg`) if present — collapses old vs new
	// ASIAIR layouts into one positional schema.
	filtered := parts[:0]
	for _, p := range parts {
		if rotationTokenRe.MatchString(p) {
			continue
		}
		filtered = append(filtered, p)
	}
	parts = filtered
	if len(parts) == 0 {
		return Tokens{}
	}

	var t Tokens
	t.FrameType = parts[0]

	isCalibration := t.FrameType == "Flat" || t.FrameType == "Dark" || t.FrameType == "Bias"

	// Positional layout after dropping rotation:
	//   Light_<target>_<exposure>_Bin<n>_<camera>_<filter>_gain<n>_<datetime>_...
	//     0      1         2         3      4        5         6          7
	//   Flat_<exposure>_Bin<n>_<camera>_<filter>_gain<n>_<datetime>_...
	//    0        1        2       3        4        5         6
	if isCalibration {
		if len(parts) > 3 {
			t.Camera = parts[3]
		}
		if len(parts) > 4 {
			t.Filter = parts[4]
		}
	} else {
		if len(parts) > 1 {
			t.Target = parts[1]
		}
		if len(parts) > 4 {
			t.Camera = parts[4]
		}
		if len(parts) > 5 {
			t.Filter = parts[5]
		}
	}

	// DateObs is decoded from the whole filename via the shared multi-format
	// scanner (ASIAIR / N.I.N.A. / SharpCap / ISO), independent of the
	// positional slot, so the header-missing fallback works across capture
	// software rather than only ASIAIR's layout.
	t.DateObs, _ = capturetime.ParseFilenameTimestamp(name)

	// OSC suffix wins for filter when present — the positional slot is
	// often "gain100" or similar on OSC filenames where it doesn't exist.
	if osc != "" {
		t.Filter = osc
	}
	return t
}
