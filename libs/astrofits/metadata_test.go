package astrofits

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/astrogo/fitsio"
)

// writeFITS creates a tiny FITS image at path with the given primary-HDU cards.
func writeFITS(t *testing.T, path string, cards ...fitsio.Card) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("create %s: %v", path, err)
	}
	defer f.Close()
	fits, err := fitsio.Create(f)
	if err != nil {
		t.Fatalf("fitsio.Create: %v", err)
	}
	defer fits.Close()

	img := fitsio.NewImage(8, []int{2, 2})
	defer img.Close()
	if err := img.Header().Append(cards...); err != nil {
		t.Fatalf("append cards: %v", err)
	}
	if err := img.Write([]int8{0, 0, 0, 0}); err != nil {
		t.Fatalf("write image data: %v", err)
	}
	if err := fits.Write(img); err != nil {
		t.Fatalf("write image: %v", err)
	}
}

func TestReadMetadataRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "light.fits")
	writeFITS(t, path,
		fitsio.Card{Name: "IMAGETYP", Value: "LIGHT"},
		fitsio.Card{Name: "OBJECT", Value: "M31"},
		fitsio.Card{Name: "FILTER", Value: "Ha"},
		fitsio.Card{Name: "EXPTIME", Value: 300.0},
		fitsio.Card{Name: "DATE-OBS", Value: "2025-08-01T22:14:03"},
		fitsio.Card{Name: "INSTRUME", Value: "ZWO ASI2600MM Pro"},
		fitsio.Card{Name: "TELESCOP", Value: "William Optics RedCat 51"},
		fitsio.Card{Name: "FOCALLEN", Value: 250.0},
	)

	m, err := ReadMetadata(path)
	if err != nil {
		t.Fatalf("ReadMetadata: %v", err)
	}
	if m.FrameType != "Light" {
		t.Errorf("FrameType = %q, want Light", m.FrameType)
	}
	if m.Target != "M31" {
		t.Errorf("Target = %q, want M31", m.Target)
	}
	if m.Filter != "Ha" {
		t.Errorf("Filter = %q, want Ha", m.Filter)
	}
	if m.Exposure != 300 {
		t.Errorf("Exposure = %v, want 300", m.Exposure)
	}
	if m.Camera != "2600MM" {
		t.Errorf("Camera = %q, want 2600MM", m.Camera)
	}
	if m.CameraRaw != "ZWO ASI2600MM Pro" {
		t.Errorf("CameraRaw = %q", m.CameraRaw)
	}
	if m.Telescope != "William Optics RedCat 51" {
		t.Errorf("Telescope = %q", m.Telescope)
	}
	if m.DateObs.IsZero() {
		t.Error("DateObs should be parsed")
	}
}

func TestReadMetadataKeywordSynonyms(t *testing.T) {
	path := filepath.Join(t.TempDir(), "synonyms.fits")
	writeFITS(t, path,
		fitsio.Card{Name: "FRAME", Value: "Light Frame"}, // synonym for IMAGETYP
		fitsio.Card{Name: "OBJNAME", Value: "NGC 7000"},  // synonym for OBJECT
		fitsio.Card{Name: "EXPOSURE", Value: 120.0},      // synonym for EXPTIME
		fitsio.Card{Name: "CAMERA", Value: "QHY268M"},    // synonym for INSTRUME
		fitsio.Card{Name: "TELESCOPE", Value: "Esprit 100"},
	)

	m, err := ReadMetadata(path)
	if err != nil {
		t.Fatalf("ReadMetadata: %v", err)
	}
	if m.FrameType != "Light" {
		t.Errorf("FrameType via FRAME = %q, want Light", m.FrameType)
	}
	if m.Target != "NGC 7000" {
		t.Errorf("Target via OBJNAME = %q, want NGC 7000", m.Target)
	}
	if m.Exposure != 120 {
		t.Errorf("Exposure via EXPOSURE = %v, want 120", m.Exposure)
	}
	if m.Telescope != "Esprit 100" {
		t.Errorf("Telescope via TELESCOPE = %q", m.Telescope)
	}
}

func TestReadMetadataNoPanicOnGarbage(t *testing.T) {
	dir := t.TempDir()
	cases := map[string][]byte{
		"empty.fits":     {},
		"truncated.fits": []byte("SIMPLE  =                    T"),
		"notfits.fits":   []byte("this is definitely not a FITS file at all\n\x00\x01\x02"),
	}
	for name, content := range cases {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, content, 0o644); err != nil {
			t.Fatal(err)
		}
		// Must return an error, never panic.
		if _, err := ReadMetadata(p); err == nil {
			t.Errorf("%s: expected an error for malformed FITS, got nil", name)
		}
	}
}
