package astrofits

import (
	"math"
	"path/filepath"
	"testing"

	"github.com/astrogo/fitsio"
)

func approx(a, b, tol float64) bool { return math.Abs(a-b) <= tol }

func TestParseSexagesimal(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want float64
		ok   bool
	}{
		{"ra hms spaces", "20 58 47.0", 20 + 58.0/60 + 47.0/3600, true},
		{"dec dms colon plus", "+44:20:12", 44 + 20.0/60 + 12.0/3600, true},
		{"dec negative", "-05 23 28", -(5 + 23.0/60 + 28.0/3600), true},
		{"plain decimal", "314.704", 314.704, true},
		{"empty", "", 0, false},
		{"garbage", "abc", 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := parseSexagesimal(tt.in)
			if ok != tt.ok {
				t.Fatalf("ok = %v, want %v", ok, tt.ok)
			}
			if ok && !approx(got, tt.want, 1e-6) {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCelestialCoordsFromObjctKeywords(t *testing.T) {
	path := filepath.Join(t.TempDir(), "objct.fits")
	writeFITS(t, path,
		fitsio.Card{Name: "OBJECT", Value: "NGC 7000"},
		fitsio.Card{Name: "OBJCTRA", Value: "20 58 47"},
		fitsio.Card{Name: "OBJCTDEC", Value: "+44 20 12"},
	)
	m, err := ReadMetadata(path)
	if err != nil {
		t.Fatalf("ReadMetadata: %v", err)
	}
	if !m.HasCoords {
		t.Fatal("HasCoords = false, want true")
	}
	// 20h58m47s × 15 = 314.696°, +44°20'12" = 44.337°.
	if !approx(m.RA, 314.696, 0.01) {
		t.Errorf("RA = %v, want ≈314.696", m.RA)
	}
	if !approx(m.Dec, 44.337, 0.01) {
		t.Errorf("Dec = %v, want ≈44.337", m.Dec)
	}
}

func TestCelestialCoordsFromWCSCrval(t *testing.T) {
	path := filepath.Join(t.TempDir(), "wcs.fits")
	writeFITS(t, path,
		fitsio.Card{Name: "OBJECT", Value: "M31"},
		fitsio.Card{Name: "CRVAL1", Value: 10.6847},
		fitsio.Card{Name: "CRVAL2", Value: 41.269},
	)
	m, err := ReadMetadata(path)
	if err != nil {
		t.Fatalf("ReadMetadata: %v", err)
	}
	if !m.HasCoords {
		t.Fatal("HasCoords = false, want true")
	}
	if !approx(m.RA, 10.6847, 1e-3) || !approx(m.Dec, 41.269, 1e-3) {
		t.Errorf("RA/Dec = %v/%v, want 10.6847/41.269", m.RA, m.Dec)
	}
}

func TestCelestialCoordsMissing(t *testing.T) {
	path := filepath.Join(t.TempDir(), "none.fits")
	writeFITS(t, path,
		fitsio.Card{Name: "OBJECT", Value: "M42"},
		fitsio.Card{Name: "EXPTIME", Value: 120.0},
	)
	m, err := ReadMetadata(path)
	if err != nil {
		t.Fatalf("ReadMetadata: %v", err)
	}
	if m.HasCoords {
		t.Errorf("HasCoords = true, want false (no coord keywords)")
	}
}

func TestNormalizeRAClampDec(t *testing.T) {
	if got := normalizeRA(-15); !approx(got, 345, 1e-9) {
		t.Errorf("normalizeRA(-15) = %v, want 345", got)
	}
	if got := normalizeRA(375); !approx(got, 15, 1e-9) {
		t.Errorf("normalizeRA(375) = %v, want 15", got)
	}
	if got := clampDec(120); got != 90 {
		t.Errorf("clampDec(120) = %v, want 90", got)
	}
	if got := clampDec(-120); got != -90 {
		t.Errorf("clampDec(-120) = %v, want -90", got)
	}
}
