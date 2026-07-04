package fingerprint

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

func dated(t time.Time) astrofits.Metadata {
	return astrofits.Metadata{
		CameraRaw: "ZWO ASI2600MM",
		Exposure:  300,
		Gain:      100,
		BinningX:  1,
		BinningY:  1,
		DateObs:   t,
		RawValues: map[string]string{"FILTER": "Ha"},
	}
}

func TestFrameFingerprintIgnoresTargetSizeAndPath(t *testing.T) {
	when := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	a := dated(when)
	a.Target = "M31"
	b := dated(when)
	b.Target = "Andromeda Galaxy" // relabelled target — same photons

	fpA, okA := FrameFingerprint(a)
	fpB, okB := FrameFingerprint(b)
	if !okA || !okB {
		t.Fatalf("dated frames must fingerprint: okA=%v okB=%v", okA, okB)
	}
	if fpA != fpB {
		t.Errorf("target label must not affect identity: %s != %s", fpA, fpB)
	}
}

func TestFrameFingerprintDistinguishesDateObs(t *testing.T) {
	fpA, _ := FrameFingerprint(dated(time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)))
	fpB, _ := FrameFingerprint(dated(time.Date(2025, 8, 1, 22, 19, 3, 0, time.UTC)))
	if fpA == fpB {
		t.Error("different DATE-OBS must yield different fingerprints")
	}
}

func TestFrameFingerprintUndatedNotOK(t *testing.T) {
	if _, ok := FrameFingerprint(dated(time.Time{})); ok {
		t.Error("undated frame must report ok=false so callers use the weak fallback")
	}
}

func TestWeakFingerprintIsStableAndTagged(t *testing.T) {
	path := filepath.Join(t.TempDir(), "u1.fits")
	if err := os.WriteFile(path, []byte("SIMPLE  =                    T / some fits header bytes"), 0o644); err != nil {
		t.Fatal(err)
	}
	first, err := WeakFingerprint(path)
	if err != nil {
		t.Fatalf("weak fingerprint: %v", err)
	}
	second, _ := WeakFingerprint(path)
	if first != second {
		t.Errorf("weak fingerprint must be stable: %s != %s", first, second)
	}
	if !strings.HasPrefix(first, weakPrefix) {
		t.Errorf("weak fingerprint must carry the %q tag, got %s", weakPrefix, first)
	}
}
