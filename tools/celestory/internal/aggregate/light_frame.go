// Package aggregate turns parsed FITS frames into the Celestory domain model:
// it drops calibration frames, resolves object identity and filter names,
// detects duplicate copies, and rolls everything up per object, per night, and
// across the whole library.
package aggregate

import (
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/internal/identity"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/internal/scan"
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
	ObjectID    string
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
	Exposure    float64
	Date        time.Time // zero when DATE-OBS was missing/unparseable
}

// Enrich drops calibration frames and resolves identity + filter for the rest,
// returning the light frames plus the count of calibration frames excluded.
func Enrich(frames []scan.Frame) (lights []LightFrame, droppedCalibration int) {
	lights = make([]LightFrame, 0, len(frames))
	for _, f := range frames {
		m := f.Meta
		if astrofits.IsCalibration(m.FrameType) {
			droppedCalibration++
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
		lights = append(lights, LightFrame{
			Path:        f.Path,
			Size:        f.Size,
			ObjectID:    r.ID,
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
			Exposure:    m.Exposure,
			Date:        m.DateObs,
		})
	}
	return lights, droppedCalibration
}

func (lf LightFrame) dupLabel() string {
	if lf.DisplayName != "" {
		return lf.DisplayName
	}
	if lf.Designation != "" {
		return lf.Designation
	}
	return lf.ObjectID
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
