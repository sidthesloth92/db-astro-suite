package astrofits

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/astrogo/fitsio"
)

// watchedKeys are stashed raw into Metadata.RawValues for diagnostics and the
// filename-fallback path.
var watchedKeys = []string{
	"IMAGETYP", "FRAME", "IMGTYPE",
	"OBJECT", "OBJNAME", "TARGET",
	"INSTRUME", "CAMERA",
	"TELESCOP", "TELESCOPE", "OPTIC",
	"FILTER", "FILTNAME", "FWHEEL",
	"DATE-OBS", "DATE",
	"FOCALLEN", "FOCRATIO", "FRATIO", "APTDIA", "APERTURE",
	"EXPTIME", "EXPOSURE", "EXP",
	"GAIN", "XBINNING", "YBINNING", "CCD-TEMP", "CCDTEMP",
	"BAYERPAT", "COLORTYP",
	"SWCREATE", "CREATOR", "PROGRAM",
}

// Metadata is the set of header fields read from a FITS file. Values are
// normalized for cross-program consistency; the raw header strings live in
// RawValues for diagnostics.
type Metadata struct {
	FrameType    string    // normalized: "Light", "Flat", "Dark", "Bias"
	Target       string    // OBJECT (or synonym), trimmed; empty for calibration
	Camera       string    // normalized compact label (e.g. "2600MM")
	CameraRaw    string    // raw INSTRUME (e.g. "ZWO ASI2600MM"), trimmed
	Telescope    string    // raw TELESCOP / optic name, trimmed; may be empty
	Filter       string    // FILTER (or synonym), trimmed; may be empty
	DateObs      time.Time // parsed DATE-OBS (or DATE fallback)
	Focal        float64   // FOCALLEN in mm; 0 if missing
	HasFocal     bool      // true when FOCALLEN was present
	FRatio       float64   // FOCRATIO / FRATIO; 0 if missing
	Aperture     float64   // APTDIA / APERTURE in mm; 0 if missing
	Exposure     float64   // EXPTIME / EXPOSURE in seconds; 0 if missing
	Gain         int       // GAIN; 0 if missing
	BinningX     int       // XBINNING; 0 if missing
	BinningY     int       // YBINNING; 0 if missing
	Temp         float64   // CCD-TEMP in °C
	BayerPattern string    // BAYERPAT / COLORTYP; non-empty implies a one-shot-colour sensor
	Program      Program   // detected capture software
	RawValues    map[string]string
}

// IsOSC reports whether the frame came from a one-shot-colour (Bayer) sensor.
func (m Metadata) IsOSC() bool {
	return strings.TrimSpace(m.BayerPattern) != ""
}

// ReadMetadata opens a FITS file, reads its header (across HDUs, with synonym
// resolution), and returns normalized Metadata. The file is closed before
// returning. It never panics: a malformed file that makes the underlying
// reader panic is converted into an error so callers can skip it and continue.
func ReadMetadata(path string) (m Metadata, err error) {
	m = Metadata{RawValues: map[string]string{}}

	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%s: malformed FITS (recovered: %v)", filepath.Base(path), r)
		}
	}()

	r, openErr := os.Open(path)
	if openErr != nil {
		return m, openErr
	}
	defer r.Close()

	f, fitsErr := fitsio.Open(r)
	if fitsErr != nil {
		return m, fmt.Errorf("open fits %s: %w", filepath.Base(path), fitsErr)
	}
	defer f.Close()

	hdus := f.HDUs()
	if len(hdus) == 0 {
		return m, fmt.Errorf("%s: no HDUs", filepath.Base(path))
	}

	headers := make([]*fitsio.Header, 0, len(hdus))
	for i := range hdus {
		headers = append(headers, f.HDU(i).Header())
	}
	src := cardSource{headers: headers}

	for _, key := range watchedKeys {
		if v := src.str(key); v != "" {
			m.RawValues[key] = v
		}
	}

	m.Program = detectProgram(src)
	m.FrameType = NormalizeFrameType(src.str("IMAGETYP", "FRAME", "IMGTYPE"))

	m.Target = src.str("OBJECT", "OBJNAME", "TARGET")
	if IsCalibration(m.FrameType) {
		m.Target = ""
	}

	m.CameraRaw = src.str("INSTRUME", "CAMERA")
	m.Camera = NormalizeCamera(m.CameraRaw)
	m.Telescope = src.str("TELESCOP", "TELESCOPE", "OPTIC")
	m.Filter = src.str("FILTER", "FILTNAME", "FWHEEL")
	m.BayerPattern = src.str("BAYERPAT", "COLORTYP")

	if t, ok := parseDateObs(src.str("DATE-OBS", "DATE")); ok {
		m.DateObs = t
	}
	if v, ok := src.float("FOCALLEN"); ok {
		m.Focal = v
		m.HasFocal = true
	}
	if v, ok := src.float("FOCRATIO", "FRATIO"); ok {
		m.FRatio = v
	}
	if v, ok := src.float("APTDIA", "APERTURE"); ok {
		m.Aperture = v
	}
	if v, ok := src.float("EXPTIME", "EXPOSURE", "EXP"); ok {
		m.Exposure = v
	}
	if v, ok := src.intval("GAIN"); ok {
		m.Gain = v
	}
	if v, ok := src.intval("XBINNING"); ok {
		m.BinningX = v
	}
	if v, ok := src.intval("YBINNING"); ok {
		m.BinningY = v
	}
	if v, ok := src.float("CCD-TEMP", "CCDTEMP"); ok {
		m.Temp = v
	}

	return m, nil
}
