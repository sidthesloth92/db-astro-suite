package library

import (
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/aggregate"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

func light(path, fp string, exp float64, date time.Time) aggregate.LightFrame {
	return aggregate.LightFrame{
		Path:        path,
		Size:        1000,
		FrameFP:     fp,
		ObjectID:    "m31",
		DisplayName: "M31",
		Designation: "M 31",
		Category:    "Galaxy",
		Filter:      "Ha",
		Camera:      "ASI2600MM",
		Exposure:    exp,
		Date:        date,
	}
}

func assembled(idx *Index) model.Ledger {
	return aggregate.Assemble(idx.Union(), nil, model.ToolInfo{})
}

func TestCumulativeMergePreservesAndDedups(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	d2 := time.Date(2025, 8, 1, 22, 5, 0, 0, time.UTC)
	d3 := time.Date(2025, 8, 2, 22, 0, 0, 0, time.UTC)

	idx, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}

	// Big disk (portfolio): two subs.
	idx.Merge("/big", []aggregate.LightFrame{
		light("/big/l1.fits", "fp1", 300, d1),
		light("/big/l2.fits", "fp2", 300, d2),
	}, false)
	if got := assembled(idx).Summary.TotalIntegrationSeconds; got != 600 {
		t.Fatalf("after big disk: total = %v, want 600", got)
	}

	// Small disk (daily): one overlap (fp2, backed up) + one new sub (fp3).
	idx.Merge("/small", []aggregate.LightFrame{
		light("/small/l2_copy.fits", "fp2", 300, d2),
		light("/small/l3.fits", "fp3", 300, d3),
	}, false)

	led := assembled(idx)
	if led.Summary.LightFrameCount != 3 {
		t.Errorf("union frame count = %d, want 3 (overlap counted once)", led.Summary.LightFrameCount)
	}
	if led.Summary.TotalIntegrationSeconds != 900 {
		t.Errorf("union total = %v, want 900 (portfolio preserved + new sub)", led.Summary.TotalIntegrationSeconds)
	}
	if led.Summary.DuplicateFileCount != 1 {
		t.Errorf("the backed-up sub should report one duplicate, got %d", led.Summary.DuplicateFileCount)
	}
}

func TestUnpluggedDiskKeepsItsFrames(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	idx, _ := Open(t.TempDir())
	idx.Merge("/big", []aggregate.LightFrame{light("/big/l1.fits", "fp1", 300, d1)}, false)

	// Re-run scanning only the (now empty / unplugged) small disk, append-only.
	idx.Merge("/small", nil, false)

	if got := assembled(idx).Summary.TotalIntegrationSeconds; got != 300 {
		t.Errorf("big-disk frame must survive a small-disk-only scan; total = %v, want 300", got)
	}
}

func TestPruneReconcilesOnlyTheScannedRoot(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	d2 := time.Date(2025, 8, 1, 22, 5, 0, 0, time.UTC)
	d3 := time.Date(2025, 8, 2, 22, 0, 0, 0, time.UTC)

	idx, _ := Open(t.TempDir())
	idx.Merge("/big", []aggregate.LightFrame{
		light("/big/l1.fits", "fp1", 300, d1),
		light("/big/l2.fits", "fp2", 300, d2),
	}, false)
	idx.Merge("/small", []aggregate.LightFrame{light("/small/l3.fits", "fp3", 300, d3)}, false)

	// User deletes l3 from the small disk and re-scans WITH prune.
	idx.Merge("/small", nil, true)

	led := assembled(idx)
	if led.Summary.LightFrameCount != 2 {
		t.Errorf("prune should drop the deleted small-disk sub; frames = %d, want 2", led.Summary.LightFrameCount)
	}
	if led.Summary.TotalIntegrationSeconds != 600 {
		t.Errorf("big disk must be untouched by pruning small; total = %v, want 600", led.Summary.TotalIntegrationSeconds)
	}
}

func TestNestedRootsDoNotSelfDuplicate(t *testing.T) {
	d := time.Date(2025, 9, 10, 21, 0, 0, 0, time.UTC)
	idx, _ := Open(t.TempDir())
	// The same physical file is covered by a parent root and a nested root.
	idx.Merge("/data", []aggregate.LightFrame{light("/data/NGC7000/001.fits", "fp1", 600, d)}, false)
	idx.Merge("/data/NGC7000", []aggregate.LightFrame{light("/data/NGC7000/001.fits", "fp1", 600, d)}, false)

	led := assembled(idx)
	if led.Summary.LightFrameCount != 1 {
		t.Errorf("nested roots over one file = 1 frame, got %d", led.Summary.LightFrameCount)
	}
	if led.Summary.DuplicateFileCount != 0 {
		t.Errorf("a file must not be a duplicate of itself; got %d", led.Summary.DuplicateFileCount)
	}
}

func TestDeletedDuplicateCopyClearsOnRescan(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	idx, _ := Open(t.TempDir())

	// One exposure backed up to two paths under the same root → a duplicate.
	idx.Merge("/data", []aggregate.LightFrame{
		light("/data/M31/ha.fits", "fp1", 300, d),
		light("/data/backup/ha.fits", "fp1", 300, d),
	}, false)
	if got := assembled(idx).Summary.DuplicateFileCount; got != 1 {
		t.Fatalf("initial duplicate count = %d, want 1", got)
	}

	// User deletes the backup copy and re-scans the root (append-only, no prune).
	idx.Merge("/data", []aggregate.LightFrame{
		light("/data/M31/ha.fits", "fp1", 300, d),
	}, false)

	led := assembled(idx)
	if led.Summary.DuplicateFileCount != 0 {
		t.Errorf("deleted duplicate must clear on re-scan; duplicate count = %d, want 0", led.Summary.DuplicateFileCount)
	}
	if led.Summary.LightFrameCount != 1 || led.Summary.TotalIntegrationSeconds != 300 {
		t.Errorf("frame stays counted once via surviving copy; frames=%d total=%v, want 1/300",
			led.Summary.LightFrameCount, led.Summary.TotalIntegrationSeconds)
	}
}

func TestDeletedUniqueSubStaysCountedAppendOnly(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	d2 := time.Date(2025, 8, 1, 22, 5, 0, 0, time.UTC)
	idx, _ := Open(t.TempDir())

	idx.Merge("/data", []aggregate.LightFrame{
		light("/data/l1.fits", "fp1", 300, d1),
		light("/data/l2.fits", "fp2", 300, d2),
	}, false)

	// User deletes a UNIQUE sub (its only copy) and re-scans append-only: culling
	// a sub must not silently un-count the photons.
	idx.Merge("/data", []aggregate.LightFrame{
		light("/data/l1.fits", "fp1", 300, d1),
	}, false)

	if got := assembled(idx).Summary.TotalIntegrationSeconds; got != 600 {
		t.Errorf("append-only must retain the deleted unique sub; total = %v, want 600 (use -prune to drop it)", got)
	}
}

func TestSaveLoadRoundTrip(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	dir := t.TempDir()
	idx, _ := Open(dir)
	idx.Merge("/big", []aggregate.LightFrame{light("/big/l1.fits", "fp1", 300, d1)}, false)
	if err := idx.Save(); err != nil {
		t.Fatal(err)
	}

	reopened, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got := assembled(reopened).Summary.TotalIntegrationSeconds; got != 300 {
		t.Errorf("reloaded index total = %v, want 300", got)
	}
}
