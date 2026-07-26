package library

import (
	"path/filepath"
	"strings"
)

// DiskProbe answers existence questions for the index heal. Defined here, at
// the consumer (ISP/DIP): the index states exactly what it needs; run wiring
// injects an os.Stat-backed implementation, tests inject a fake.
type DiskProbe interface {
	// RootReachable reports whether the folder root currently exists on disk
	// (i.e. its disk is mounted). Entries under unreachable roots are never
	// healed — they cannot be verified.
	RootReachable(root string) bool
	// FileExists reports whether the file at path definitively exists.
	// Implementations must report true when existence cannot be determined
	// (permission or I/O errors), so an entry is only ever dropped on a
	// certain not-exist.
	FileExists(path string) bool
}

// ReconcileMoved heals stale references left behind when files are moved
// between folders. The freshly scanned root is the source of truth; for each
// of its frames that another folder also references:
//
//   - other root reachable, file still present → a genuine second copy: the
//     entry is kept (and reported as a duplicate).
//   - other root reachable, file gone → the file was moved or deleted: the
//     stale entry is dropped so no phantom duplicate is reported (self-heal).
//   - other root unreachable (disconnected disk) → the entry is kept
//     untouched; the scanned copy is simply treated as the latest location
//     (the duplicate report suppresses unverifiable copies separately).
//
// Only frames also present under scannedRoot are ever considered, so a heal
// can never remove the last record of a frame or change integration totals —
// and no FITS file is ever touched, only index entries.
func (i *Index) ReconcileMoved(scannedRoot string, probe DiskProbe) {
	scannedRoot = absOrSelf(scannedRoot)
	scanned := i.Folders[scannedRoot]
	if len(scanned) == 0 {
		return
	}
	inScan := make(map[string]struct{}, len(scanned))
	for _, fp := range scanned {
		inScan[fp] = struct{}{}
	}

	reachable := map[string]bool{}
	healed := 0
	for root, files := range i.Folders {
		if root == scannedRoot {
			continue
		}
		for rel, fp := range files {
			if _, overlaps := inScan[fp]; !overlaps {
				continue // unique to that folder — never touched
			}
			r, probed := reachable[root]
			if !probed {
				r = probe.RootReachable(root)
				reachable[root] = r
			}
			if !r {
				continue // disconnected disk — keep the entry
			}
			if probe.FileExists(filepath.Join(root, rel)) {
				continue // real second copy — keep and report as a duplicate
			}
			delete(files, rel) // moved or deleted: heal the stale reference
			i.log.Info("healed stale reference", "root", root, "file", rel)
			healed++
		}
	}
	if healed > 0 {
		i.compact()
	}
	unreachableRoots := 0
	for _, r := range reachable {
		if !r {
			unreachableRoots++
		}
	}
	i.log.Info("reconcile complete",
		"healed", healed,
		"rootsProbed", len(reachable),
		"unreachableRoots", unreachableRoots)
}

// VerifiablePath returns a predicate reporting whether a union path can be
// checked on disk right now — i.e. it lies under at least one reachable
// indexed root. The duplicate report uses it to suppress copies on
// disconnected disks (their index entries stay; only the report is filtered).
// Reachability is probed once per root, when the predicate is built.
func (i *Index) VerifiablePath(probe DiskProbe) func(path string) bool {
	reachable := make([]string, 0, len(i.Folders))
	for root := range i.Folders {
		if probe.RootReachable(root) {
			reachable = append(reachable, root)
			continue
		}
		i.log.Info("root unreachable; its copies are unverifiable", "root", root)
	}
	return func(path string) bool {
		for _, root := range reachable {
			if pathWithin(root, path) {
				return true
			}
		}
		return false
	}
}

// pathWithin reports whether p is root itself or nested beneath it.
func pathWithin(root, p string) bool {
	rel, err := filepath.Rel(root, p)
	if err != nil {
		return false
	}
	return rel == "." || !strings.HasPrefix(rel, "..")
}
