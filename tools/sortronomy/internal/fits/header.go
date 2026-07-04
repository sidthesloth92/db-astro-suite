// Package fits is a thin wrapper around github.com/astrogo/fitsio for the
// metadata Sortronomy actually needs. It reads everything sortronomy uses to
// organize frames in one open, and writes the filter tag (the FILTER and
// FILTDESC keywords) back when the user opts to tag a filter.
package fits

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/astrogo/fitsio"
	"github.com/sidthesloth92/db-astro-suite/libs/capturetime"
)

// Metadata is the set of header fields Sortronomy reads from a FITS file.
// Fields are normalized for cross-program consistency; raw values from the
// header live in RawValues for diagnostics.
type Metadata struct {
	FrameType string    // normalized: "Light", "Flat", "Dark", "Bias"
	Target    string    // OBJECT, trimmed; empty for calibration frames
	Camera    string    // normalized short label (e.g. "2600MM")
	Filter    string    // FILTER, trimmed; may be empty
	DateObs   time.Time // parsed DATE-OBS (UTC per the FITS standard)
	DateLoc   time.Time // parsed DATE-LOC (local time, written by N.I.N.A.); zero when absent
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
		"IMAGETYP", "OBJECT", "INSTRUME", "FILTER", "FILTDESC", "DATE-OBS",
		"DATE-LOC", "FOCALLEN", "EXPTIME", "EXPOSURE", "GAIN", "XBINNING",
		"YBINNING", "CCD-TEMP", "SWCREATE", "CREATOR", "PROGRAM",
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

	if t, ok := capturetime.ParseFitsDateTime(stringCard(hdr, "DATE-OBS")); ok {
		m.DateObs = t
	}
	if t, ok := capturetime.ParseFitsDateTime(stringCard(hdr, "DATE-LOC")); ok {
		m.DateLoc = t
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

// Filter-tag keywords and card comments written by WriteFilter. FILTER is
// the standard keyword every capture/processing tool reads for the filter
// name; FITS has no standard keyword for a filter description, so the
// description gets its own FILTDESC card (readable as a first-class value,
// unlike a card comment which many tools drop or truncate). FILTDESC carries
// no card comment: the description value can be long, and a comment that
// doesn't fit on the 80-char card would spill onto a separate COMMENT card —
// the tag must touch exactly the FILTER and FILTDESC cards, nothing else.
const (
	keyFilter         = "FILTER"
	keyFilterDesc     = "FILTDESC"
	commentFilterName = "Filter name (set by Sortronomy)"
)

// Card-geometry limits for the filter tag. A FITS header card is exactly 80
// characters: keyword (8) + "= " (2) + the quoted value + optional " / "
// comment. Values that don't fit make the encoder spill the comment onto a
// separate COMMENT card or split the value across CONTINUE cards — and the
// filter tag must stay within its own two cards. Inputs are validated against
// these limits so neither can ever happen.
const (
	// MaxFilterNameLen is the longest FILTER value that still leaves room on
	// the same card for the Sortronomy comment:
	// 80 − 8 (keyword) − 2 ("= ") − 2 (quotes) − 3 (" / ") − the comment.
	MaxFilterNameLen = 80 - 8 - 2 - 2 - 3 - len(commentFilterName)

	// MaxFilterDescLen is the longest FILTDESC value that fits on a single
	// card: 80 − 8 (keyword) − 2 ("= ") − 2 (quotes) = 68, minus 1 because
	// the encoder requires the quoted value to fit strictly inside the line
	// before it switches to CONTINUE cards.
	MaxFilterDescLen = 80 - 8 - 2 - 2 - 1
)

// ValidateFilterName reports whether name can be stored as the FILTER card
// value without spilling beyond the card. Presence is the caller's concern —
// an empty name passes.
func ValidateFilterName(name string) error {
	return validateCardString("filter name", name, MaxFilterNameLen)
}

// ValidateFilterDescription reports whether desc can be stored as the
// FILTDESC card value on a single card. The description is optional — an
// empty string passes.
func ValidateFilterDescription(desc string) error {
	return validateCardString("filter description", desc, MaxFilterDescLen)
}

// validateCardString enforces what the fitsio encoder can safely put in a
// string card value: at most maxLen characters and printable ASCII with no
// single quotes (the encoder does not escape quotes, so one would corrupt
// the card).
func validateCardString(what, s string, maxLen int) error {
	if len(s) > maxLen {
		return fmt.Errorf("%s is %d characters — at most %d fit on its FITS header card", what, len(s), maxLen)
	}
	for _, r := range s {
		if r == '\'' {
			return fmt.Errorf("%s must not contain a single quote (')", what)
		}
		if r < 0x20 || r > 0x7e {
			return fmt.Errorf("%s contains %q — FITS headers only allow printable ASCII", what, r)
		}
	}
	return nil
}

// WriteFilter tags the primary HDU header of path with the user's filter:
// FILTER = name, plus FILTDESC = desc when desc is non-empty. No other card
// is added or changed. Implementation: read the entire file, modify the
// header in memory, write to a temp file in the same directory, then
// atomic rename.
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
	hdr := primary.Header()
	hdr.Set(keyFilter, name, commentFilterName)
	if desc != "" {
		hdr.Set(keyFilterDesc, desc, "")
	}
	retireEndCard(hdr)

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

// retireEndCard neutralizes the END marker card that the fitsio decoder
// retains in the card list of a file read from disk. Header.Set appends
// missing keywords after that marker, so on re-encode they would land beyond
// the END record — where FITS readers never look — making the filter tag
// silently invisible. The marker is rotated past the appended cards and
// blanked: a card with an empty name and comment encodes to zero bytes, so
// the slot vanishes from the written header, and the encoder emits its own
// END terminator on write.
func retireEndCard(hdr *fitsio.Header) {
	endIdx := hdr.Index("END")
	if endIdx < 0 {
		return
	}
	last := endIdx
	for _, key := range []string{keyFilter, keyFilterDesc} {
		if i := hdr.Index(key); i > last {
			last = i
		}
	}
	for i := endIdx; i < last; i++ {
		*hdr.Card(i) = *hdr.Card(i + 1)
	}
	*hdr.Card(last) = fitsio.Card{}
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
