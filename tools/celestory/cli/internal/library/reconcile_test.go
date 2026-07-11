package library

import (
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/aggregate"
)

// fakeProbe is a map-backed DiskProbe so reconcile tests never touch the
// filesystem. Roots and paths absent from the maps read as unreachable/gone.
type fakeProbe struct {
	reachableRoots map[string]bool
	existingFiles  map[string]bool
}

func (p fakeProbe) RootReachable(root string) bool { return p.reachableRoots[root] }
func (p fakeProbe) FileExists(path string) bool    { return p.existingFiles[path] }

func TestReconcileMovedHealsStaleEntryWhenOldCopyIsGone(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	idx, _ := Open(nil, t.TempDir())

	// Scan A, then the user moves the file to B and scans B. A is still
	// reachable (same machine) but the file is gone from it: a move.
	idx.Merge("/a", []aggregate.LightFrame{light("/a/sub.fits", "fp1", 300, d)}, false)
	idx.Merge("/b", []aggregate.LightFrame{light("/b/sub.fits", "fp1", 300, d)}, false)
	idx.ReconcileMoved("/b", fakeProbe{
		reachableRoots: map[string]bool{"/a": true, "/b": true},
		existingFiles:  map[string]bool{"/b/sub.fits": true},
	})

	if len(idx.Folders["/a"]) != 0 {
		t.Errorf("A's stale entry should be healed after the move; got %v", idx.Folders["/a"])
	}
	led := assembled(idx)
	if led.Summary.DuplicateFileCount != 0 {
		t.Errorf("a moved file must not report a phantom duplicate; got %d", led.Summary.DuplicateFileCount)
	}
	if led.Summary.TotalIntegrationSeconds != 300 {
		t.Errorf("the frame must stay counted via its new location; total = %v, want 300", led.Summary.TotalIntegrationSeconds)
	}
}

func TestReconcileMovedKeepsGenuineDuplicateCopy(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	idx, _ := Open(nil, t.TempDir())

	// The same sub really does exist in both folders (a backup): both entries
	// stay, and the duplicate is reported.
	idx.Merge("/a", []aggregate.LightFrame{light("/a/sub.fits", "fp1", 300, d)}, false)
	idx.Merge("/b", []aggregate.LightFrame{light("/b/sub.fits", "fp1", 300, d)}, false)
	idx.ReconcileMoved("/b", fakeProbe{
		reachableRoots: map[string]bool{"/a": true, "/b": true},
		existingFiles:  map[string]bool{"/a/sub.fits": true, "/b/sub.fits": true},
	})

	if len(idx.Folders["/a"]) != 1 {
		t.Errorf("a real second copy must be kept; got %v", idx.Folders["/a"])
	}
	if got := assembled(idx).Summary.DuplicateFileCount; got != 1 {
		t.Errorf("a real second copy must be reported; DuplicateFileCount = %d, want 1", got)
	}
}

func TestReconcileMovedKeepsEntriesOnUnreachableDisk(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	idx, _ := Open(nil, t.TempDir())

	// The overlapping copy lives on a disconnected disk: unverifiable, so the
	// entry is kept untouched (the report suppresses it separately).
	idx.Merge("/backup-disk", []aggregate.LightFrame{light("/backup-disk/sub.fits", "fp1", 300, d)}, false)
	idx.Merge("/b", []aggregate.LightFrame{light("/b/sub.fits", "fp1", 300, d)}, false)
	idx.ReconcileMoved("/b", fakeProbe{
		reachableRoots: map[string]bool{"/b": true}, // backup-disk unplugged
		existingFiles:  map[string]bool{"/b/sub.fits": true},
	})

	if len(idx.Folders["/backup-disk"]) != 1 {
		t.Errorf("an unreachable disk's entry must never be healed; got %v", idx.Folders["/backup-disk"])
	}
}

func TestReconcileMovedNeverTouchesNonOverlappingFrames(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	d2 := time.Date(2025, 8, 1, 22, 5, 0, 0, time.UTC)
	idx, _ := Open(nil, t.TempDir())

	// A holds one overlapping frame (moved to B) and one unique frame whose
	// file also happens to be missing right now. Only the overlapping entry
	// may be healed — the unique frame is A's last record and must survive.
	idx.Merge("/a", []aggregate.LightFrame{
		light("/a/moved.fits", "fp1", 300, d1),
		light("/a/unique.fits", "fp2", 300, d2),
	}, false)
	idx.Merge("/b", []aggregate.LightFrame{light("/b/moved.fits", "fp1", 300, d1)}, false)
	idx.ReconcileMoved("/b", fakeProbe{
		reachableRoots: map[string]bool{"/a": true, "/b": true},
		existingFiles:  map[string]bool{"/b/moved.fits": true}, // nothing in /a "exists"
	})

	if _, kept := idx.Folders["/a"]["unique.fits"]; !kept {
		t.Fatal("a frame not present in the scanned folder must never be healed away")
	}
	if _, healed := idx.Folders["/a"]["moved.fits"]; healed {
		t.Error("the moved frame's stale entry should have been healed")
	}
	if got := assembled(idx).Summary.TotalIntegrationSeconds; got != 600 {
		t.Errorf("both frames must stay counted; total = %v, want 600", got)
	}
}

func TestReconcileMovedLogsHealsAndSummary(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	var buf strings.Builder
	idx, _ := Open(slog.New(slog.NewTextHandler(&buf, nil)), t.TempDir())

	idx.Merge("/a", []aggregate.LightFrame{light("/a/sub.fits", "fp1", 300, d)}, false)
	idx.Merge("/b", []aggregate.LightFrame{light("/b/sub.fits", "fp1", 300, d)}, false)
	idx.ReconcileMoved("/b", fakeProbe{
		reachableRoots: map[string]bool{"/a": true, "/b": true},
		existingFiles:  map[string]bool{"/b/sub.fits": true},
	})

	out := buf.String()
	for _, want := range []string{
		"index merged",
		"healed stale reference",
		"file=sub.fits",
		"reconcile complete",
		"healed=1",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("log missing %q in:\n%s", want, out)
		}
	}
}

func TestVerifiablePathTracksReachableRoots(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	idx, _ := Open(nil, t.TempDir())
	idx.Merge("/online", []aggregate.LightFrame{light("/online/sub.fits", "fp1", 300, d)}, false)
	idx.Merge("/offline", []aggregate.LightFrame{light("/offline/sub.fits", "fp1", 300, d)}, false)

	verifiable := idx.VerifiablePath(fakeProbe{reachableRoots: map[string]bool{"/online": true}})

	if !verifiable("/online/sub.fits") {
		t.Error("a path under a reachable root must be verifiable")
	}
	if verifiable("/offline/sub.fits") {
		t.Error("a path under an unreachable root must not be verifiable")
	}
	if verifiable("/untracked/sub.fits") {
		t.Error("a path under no indexed root must not be verifiable")
	}
}
