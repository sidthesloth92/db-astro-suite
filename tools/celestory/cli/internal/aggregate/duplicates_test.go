package aggregate

import (
	"strings"
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
)

func TestFilterVerifiableDropsUnverifiableCopies(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	d2 := time.Date(2025, 8, 2, 22, 14, 3, 0, time.UTC)
	// Set 1: one verifiable + one unverifiable copy → collapses, not a duplicate.
	// Set 2: two verifiable + one unverifiable copy → survives with two paths.
	frames := []scan.Frame{
		frame("/online/s1.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/offline/s1.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/online/s2.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
		frame("/online/bak/s2.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
		frame("/offline/s2.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
	}
	lights, _ := Enrich(frames)
	onlineOnly := func(path string) bool { return strings.HasPrefix(path, "/online/") }

	got := DetectDuplicates(lights).FilterVerifiable(onlineOnly)

	if len(got.Sets) != 1 {
		t.Fatalf("sets = %d, want 1 (the pair with a single verifiable copy collapses)", len(got.Sets))
	}
	if len(got.Sets[0].Paths) != 2 {
		t.Errorf("surviving set paths = %v, want the two online copies only", got.Sets[0].Paths)
	}
	if got.FileCount != 1 {
		t.Errorf("FileCount = %d, want 1 (one redundant verifiable copy)", got.FileCount)
	}
	if want := got.Sets[0].SizeBytes; got.WastedBytes != want {
		t.Errorf("WastedBytes = %d, want %d (recomputed from surviving copies)", got.WastedBytes, want)
	}
	if full := DetectDuplicates(lights); len(got.Deduped) != len(full.Deduped) {
		t.Errorf("Deduped must be untouched by filtering; got %d, want %d", len(got.Deduped), len(full.Deduped))
	}
}

func TestFilterVerifiableNilPredicateIsIdentity(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	frames := []scan.Frame{
		frame("/a/s.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
		frame("/b/s.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
	}
	lights, _ := Enrich(frames)

	rep := DetectDuplicates(lights)
	got := rep.FilterVerifiable(nil)
	if len(got.Sets) != len(rep.Sets) || got.FileCount != rep.FileCount || got.WastedBytes != rep.WastedBytes {
		t.Errorf("nil predicate must return the report unchanged; got %+v, want %+v", got, rep)
	}
}

func TestAssembleSuppressesUnverifiableDuplicatesButKeepsIntegration(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	// The only "duplicate" pairs a scanned copy with one on a disconnected disk.
	frames := []scan.Frame{
		frame("/online/s.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
		frame("/offline/s.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
	}
	lights, _ := Enrich(frames)
	onlineOnly := func(path string) bool { return strings.HasPrefix(path, "/online/") }

	led := Assemble(lights, nil, model.ToolInfo{}, "/online", onlineOnly)

	if len(led.Duplicates) != 0 {
		t.Errorf("an unverifiable copy must not be reported as a duplicate; got %v", led.Duplicates)
	}
	if led.Summary.DuplicateFileCount != 0 || led.Summary.DuplicateWastedBytes != 0 {
		t.Errorf("tallies must match the suppressed report; count=%d wasted=%d, want 0/0",
			led.Summary.DuplicateFileCount, led.Summary.DuplicateWastedBytes)
	}
	if led.Summary.LightFrameCount != 1 || led.Summary.TotalIntegrationSeconds != 300 {
		t.Errorf("integration must be unaffected; frames=%d total=%v, want 1/300",
			led.Summary.LightFrameCount, led.Summary.TotalIntegrationSeconds)
	}
	if got := OutsideRootDuplicateSets(lights, "/online", onlineOnly); got != 0 {
		t.Errorf("a suppressed set must not be hinted as hidden elsewhere; got %d, want 0", got)
	}
}
