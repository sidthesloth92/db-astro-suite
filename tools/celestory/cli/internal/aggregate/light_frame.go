// Package aggregate turns parsed FITS frames into the Celestory domain model:
// it drops calibration frames, resolves target identity and filter names,
// detects duplicate copies, and rolls everything up per target, per night, and
// across the whole library.
package aggregate

import (
	"path/filepath"
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/fingerprint"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/identity"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
)

// Filter labels used when a frame carries no usable FILTER keyword.
const (
	filterOSC  = "OSC"
	filterNone = "No Filter"
)

// LightFrame is an enriched, light-only frame ready for aggregation.
type LightFrame struct {
	Path        string
	Size        int64
	FrameFP     string // content/path-independent identity; the dedup key
	WeakID      bool   // FrameFP came from the content fallback (undated frame)
	TargetID    string
	DisplayName string
	Designation string
	Aliases     []string
	Type        *string
	Category    string
	Filter      string
	Camera      string // friendly camera label (raw INSTRUME)
	Telescope   string
	Focal       float64
	FRatio      float64
	IsOSC       bool // one-shot-colour (Bayer) sensor — used for camera sub-type classification
	Exposure    float64
	Date        time.Time // zero when DATE-OBS was missing/unparseable
	RA          *float64  // J2000 RA (deg): the frame's FITS coords, else the catalog fallback
	Dec         *float64  // J2000 Dec (deg): the frame's FITS coords, else the catalog fallback
}

// Enrich keeps only genuine single light sub-exposures: it drops calibration
// frames (Flat/Dark/Bias) and stacked masters (which carry summed exposure and
// would double-count their subs), resolves each remaining frame's target
// identity + filter, and assigns its content/path-independent FrameFP (falling
// back to a content hash for undated frames). It returns the light frames plus
// the count of frames excluded.
func Enrich(frames []scan.Frame) (lights []LightFrame, dropped int) {
	lights = make([]LightFrame, 0, len(frames))
	for _, f := range frames {
		m := f.Meta
		if astrofits.IsCalibration(m.FrameType) || m.IsStacked() || looksStacked(f.Path) {
			dropped++
			continue
		}
		r := identity.Resolve(m.Target)
		filter := identity.NormalizeFilter(m.Filter)
		if filter == "" {
			if m.IsOSC() {
				filter = filterOSC
			} else {
				filter = filterNone
			}
		}
		fp, weak := frameIdentity(m, f.Path)
		ra, dec := frameCoords(m, r)
		lights = append(lights, LightFrame{
			Path:        f.Path,
			Size:        f.Size,
			FrameFP:     fp,
			WeakID:      weak,
			TargetID:    r.ID,
			DisplayName: r.DisplayName,
			Designation: r.Designation,
			Aliases:     r.Aliases,
			Type:        r.Type,
			Category:    r.Category,
			Filter:      filter,
			Camera:      firstNonEmpty(strings.TrimSpace(m.CameraRaw), m.Camera),
			Telescope:   strings.TrimSpace(m.Telescope),
			Focal:       m.Focal,
			FRatio:      m.FRatio,
			IsOSC:       m.IsOSC(),
			Exposure:    m.Exposure,
			Date:        m.DateObs,
			RA:          ra,
			Dec:         dec,
		})
	}
	return lights, dropped
}

// frameIdentity returns the dedup fingerprint for a frame and whether it is a
// weak (content-derived) identity. Dated frames use the header-based
// FrameFingerprint; undated frames fall back to a content hash, and a last
// resort of the path so a frame is always counted (never silently merged away).
func frameIdentity(m astrofits.Metadata, path string) (fp string, weak bool) {
	if fp, ok := fingerprint.FrameFingerprint(m); ok {
		return fp, false
	}
	if fp, err := fingerprint.WeakFingerprint(path); err == nil {
		return fp, true
	}
	return "p:" + path, true
}

// frameCoords resolves a frame's J2000 RA/Dec (decimal degrees): the FITS
// header coordinates when the frame carried them, otherwise the resolved
// catalog coordinates (the hybrid). Returns nil when neither source has coords.
func frameCoords(m astrofits.Metadata, r identity.Resolved) (ra, dec *float64) {
	if m.HasCoords {
		raV, decV := m.RA, m.Dec
		return &raV, &decV
	}
	return r.RA, r.Dec
}

// stackNameHints are filename markers of a stacked/integrated master that should
// never count toward integration even when the header lacks a stack count.
var stackNameHints = []string{"master", "stack", "integration"}

// looksStacked reports whether a file's name marks it as a stacked master.
func looksStacked(path string) bool {
	name := strings.ToLower(filepath.Base(path))
	for _, hint := range stackNameHints {
		if strings.Contains(name, hint) {
			return true
		}
	}
	return false
}

func (lf LightFrame) dupLabel() string {
	if lf.DisplayName != "" {
		return lf.DisplayName
	}
	if lf.Designation != "" {
		return lf.Designation
	}
	return lf.TargetID
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// dateKey returns the YYYY-MM-DD night key for a frame, or "" when undated.
func dateKey(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format("2006-01-02")
}
