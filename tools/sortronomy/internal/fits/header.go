// Package fits is a thin wrapper around github.com/astrogo/fitsio for the
// metadata Sortronomy actually needs. It reads everything sortronomy uses to
// organize frames in one open, and writes the FILTER keyword back when the
// user opts to tag a filter.
package fits

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/astrogo/fitsio"
)

// Metadata is the set of header fields Sortronomy reads from a FITS file.
// Fields are normalized for cross-program consistency; raw values from the
// header live in RawValues for diagnostics.
type Metadata struct {
	FrameType string    // normalized: "Light", "Flat", "Dark", "Bias"
	Target    string    // OBJECT, trimmed; empty for calibration frames
	Camera    string    // normalized short label (e.g. "2600MM")
	Filter    string    // FILTER, trimmed; may be empty
	DateObs   time.Time // parsed DATE-OBS
	Focal     float64   // FOCALLEN in mm; 0 if missing
	Exposure  float64   // EXPTIME in seconds; 0 if missing
	Gain      int       // GAIN; 0 if missing
	BinningX  int       // XBINNING; 0 if missing
	BinningY  int       // YBINNING; 0 if missing
	Temp      float64   // CCD-TEMP in °C
	Program   Program   // detected capture software
	Software  string    // raw creator string: first non-empty of SWCREATE/CREATOR/PROGRAM
	RawValues map[string]string

	// HasFocal is true when FOCALLEN was present in the header. The Focal
	// field defaults to 0, which is ambiguous (some lenses do report 0mm
	// in error). Callers should check HasFocal before grouping by focal.
	HasFocal bool
}

// ReadMetadata opens a FITS file, reads its primary HDU header, and returns
// the normalized Metadata. The file is closed before returning.
func ReadMetadata(path string) (Metadata, error) {
	m := Metadata{RawValues: map[string]string{}}

	r, err := os.Open(path)
	if err != nil {
		return m, err
	}
	defer r.Close()

	f, err := fitsio.Open(r)
	if err != nil {
		return m, fmt.Errorf("open fits %s: %w", filepath.Base(path), err)
	}
	defer f.Close()

	if len(f.HDUs()) == 0 {
		return m, fmt.Errorf("%s: no HDUs", filepath.Base(path))
	}
	hdr := f.HDU(0).Header()

	// Stash raw strings of every key we look at, for diagnostics + the
	// filename-fallback path.
	for _, key := range []string{
		"IMAGETYP", "OBJECT", "INSTRUME", "FILTER", "DATE-OBS",
		"FOCALLEN", "EXPTIME", "EXPOSURE", "GAIN", "XBINNING", "YBINNING",
		"CCD-TEMP", "SWCREATE", "CREATOR", "PROGRAM",
	} {
		if c := hdr.Get(key); c != nil {
			m.RawValues[key] = fmt.Sprintf("%v", c.Value)
		}
	}

	m.Program = detectProgram(hdr)
	m.Software = readSoftware(hdr)
	m.FrameType = normalizeFrameType(stringCard(hdr, "IMAGETYP"))

	m.Target = strings.TrimSpace(stringCard(hdr, "OBJECT"))
	if isCalibration(m.FrameType) {
		m.Target = ""
	}

	m.Camera = normalizeCamera(stringCard(hdr, "INSTRUME"))
	m.Filter = strings.TrimSpace(stringCard(hdr, "FILTER"))

	if t, ok := parseDateObs(stringCard(hdr, "DATE-OBS")); ok {
		m.DateObs = t
	}

	if v, ok := floatCard(hdr, "FOCALLEN"); ok {
		m.Focal = v
		m.HasFocal = true
	}
	if v, ok := floatCard(hdr, "EXPTIME"); ok {
		m.Exposure = v
	} else if v, ok := floatCard(hdr, "EXPOSURE"); ok {
		m.Exposure = v
	}
	if v, ok := intCard(hdr, "GAIN"); ok {
		m.Gain = v
	}
	if v, ok := intCard(hdr, "XBINNING"); ok {
		m.BinningX = v
	}
	if v, ok := intCard(hdr, "YBINNING"); ok {
		m.BinningY = v
	}
	if v, ok := floatCard(hdr, "CCD-TEMP"); ok {
		m.Temp = v
	}

	return m, nil
}

// WriteFilter sets FILTER = name with the given comment in the primary HDU
// header of path. Implementation: read the entire file, modify the header
// in memory, write to a temp file in the same directory, then atomic rename.
func WriteFilter(path, name, desc string) error {
	r, err := os.Open(path)
	if err != nil {
		return err
	}
	defer r.Close()

	f, err := fitsio.Open(r)
	if err != nil {
		return fmt.Errorf("open fits: %w", err)
	}
	defer f.Close()

	primary := f.HDU(0)
	primary.Header().Set("FILTER", name, desc)

	tmp, err := os.CreateTemp(filepath.Dir(path), ".sortronomy-*.fit")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	cleanup := func() { _ = os.Remove(tmpPath) }

	w, err := fitsio.Create(tmp)
	if err != nil {
		tmp.Close()
		cleanup()
		return fmt.Errorf("create temp fits: %w", err)
	}
	if err := w.Write(primary); err != nil {
		w.Close()
		tmp.Close()
		cleanup()
		return fmt.Errorf("write fits: %w", err)
	}
	// Copy any additional HDUs untouched.
	for i := 1; i < len(f.HDUs()); i++ {
		if err := w.Write(f.HDU(i)); err != nil {
			w.Close()
			tmp.Close()
			cleanup()
			return fmt.Errorf("write hdu %d: %w", i, err)
		}
	}
	if err := w.Close(); err != nil {
		tmp.Close()
		cleanup()
		return err
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return err
	}
	return os.Rename(tmpPath, path)
}

// Helpers --------------------------------------------------------------------

func stringCard(hdr *fitsio.Header, key string) string {
	c := hdr.Get(key)
	if c == nil || c.Value == nil {
		return ""
	}
	switch v := c.Value.(type) {
	case string:
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}

func floatCard(hdr *fitsio.Header, key string) (float64, bool) {
	c := hdr.Get(key)
	if c == nil || c.Value == nil {
		return 0, false
	}
	switch v := c.Value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		return parseFloat(v)
	}
	return 0, false
}

func intCard(hdr *fitsio.Header, key string) (int, bool) {
	if v, ok := floatCard(hdr, key); ok {
		return int(v), true
	}
	return 0, false
}

func parseFloat(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	var f float64
	if _, err := fmt.Sscanf(s, "%g", &f); err != nil {
		return 0, false
	}
	return f, true
}

// parseDateObs handles both "2026-01-18T06:55:54" (FITS standard) and
// "2026-01-18T06:55:54.123" (some programs include milliseconds). Falls
// through to "2026-01-18" for date-only.
func parseDateObs(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	formats := []string{
		"2006-01-02T15:04:05.999999",
		"2006-01-02T15:04:05.000",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, layout := range formats {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func isCalibration(frameType string) bool {
	switch frameType {
	case "Flat", "Dark", "Bias":
		return true
	}
	return false
}

// IsFITS returns true if the file has a .fit / .fits extension and is not
// a dotfile. Sortronomy uses this to filter directory walks.
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

// Drain reads from r until EOF and discards; used by tests.
func Drain(r io.Reader) { _, _ = io.Copy(io.Discard, r) }
