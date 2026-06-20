package aggregate

import (
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// DuplicateReport is the outcome of duplicate detection.
type DuplicateReport struct {
	Deduped     []LightFrame         // one frame per set + all singletons
	Sets        []model.DuplicateSet // each set of identical copies at >1 path
	WastedBytes int64                // redundant disk used by the extra copies
	FileCount   int                  // number of redundant copies (sum of len-1)
}

// DetectDuplicates finds copies of the same sub at different paths using the
// content/path-independent FrameFP as the identity key — so a sub copied to two
// folders (or re-saved) is counted once regardless of filename, path, size, or
// target label, while genuinely distinct exposures (different DATE-OBS) stay
// separate. One frame per set is kept (the lexicographically-first path); the
// rest are excluded from aggregation but reported.
func DetectDuplicates(lights []LightFrame) DuplicateReport {
	groups := map[string][]int{}
	for i, lf := range lights {
		groups[lf.FrameFP] = append(groups[lf.FrameFP], i)
	}

	keys := make([]string, 0, len(groups))
	for k := range groups {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	rep := DuplicateReport{Sets: []model.DuplicateSet{}}
	drop := map[int]bool{}
	for _, k := range keys {
		idxs := groups[k]
		if len(idxs) < 2 {
			continue
		}
		sort.Slice(idxs, func(a, b int) bool {
			return lights[idxs[a]].Path < lights[idxs[b]].Path
		})
		paths := make([]string, len(idxs))
		for n, id := range idxs {
			paths[n] = lights[id].Path
		}
		first := lights[idxs[0]]
		rep.WastedBytes += int64(len(idxs)-1) * first.Size
		rep.FileCount += len(idxs) - 1
		for n := 1; n < len(idxs); n++ {
			drop[idxs[n]] = true
		}
		rep.Sets = append(rep.Sets, model.DuplicateSet{
			Designation: first.dupLabel(),
			DateObs:     dupDateObs(first.Date),
			SizeBytes:   first.Size,
			Paths:       paths,
		})
	}

	sort.SliceStable(rep.Sets, func(i, j int) bool {
		if rep.Sets[i].DateObs != rep.Sets[j].DateObs {
			return rep.Sets[i].DateObs < rep.Sets[j].DateObs
		}
		return rep.Sets[i].Designation < rep.Sets[j].Designation
	})

	rep.Deduped = make([]LightFrame, 0, len(lights))
	for i, lf := range lights {
		if drop[i] {
			continue
		}
		rep.Deduped = append(rep.Deduped, lf)
	}
	return rep
}

// dupDateObs formats a frame's DATE-OBS for the duplicate report, or "" when the
// frame was undated (identity came from the content fallback).
func dupDateObs(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

// ScopeToRoot narrows the report to duplicate sets with at least one copy under
// root — the view that matters for a single run, where a set entirely on other
// (possibly disconnected) folders is just noise. WastedBytes/FileCount are
// recomputed for the scoped sets so the headline tallies match what is listed.
// Deduped is carried through untouched, so integration totals stay full-library.
// An empty root returns the report unchanged (the whole-library view).
func (r DuplicateReport) ScopeToRoot(root string) DuplicateReport {
	if root == "" {
		return r
	}
	scoped := DuplicateReport{Deduped: r.Deduped, Sets: []model.DuplicateSet{}}
	for _, set := range r.Sets {
		if !setTouchesRoot(set, root) {
			continue
		}
		scoped.Sets = append(scoped.Sets, set)
		scoped.WastedBytes += int64(len(set.Paths)-1) * set.SizeBytes
		scoped.FileCount += len(set.Paths) - 1
	}
	return scoped
}

// OutsideRootDuplicateSets returns how many duplicate sets in the full library
// fall entirely outside root — i.e. how many a root-scoped report omits. It lets
// a scoped run tell the user that more duplicates exist elsewhere (and that
// -all-duplicates reveals them). Returns 0 for an empty root (nothing is hidden).
func OutsideRootDuplicateSets(lights []LightFrame, root string) int {
	if root == "" {
		return 0
	}
	full := DetectDuplicates(lights)
	return len(full.Sets) - len(full.ScopeToRoot(root).Sets)
}

// setTouchesRoot reports whether any path in a duplicate set lives under root.
func setTouchesRoot(set model.DuplicateSet, root string) bool {
	for _, p := range set.Paths {
		if pathUnder(root, p) {
			return true
		}
	}
	return false
}

// pathUnder reports whether p is root itself or nested beneath it, comparing
// absolute forms so a relative scan root matches the absolute union paths.
func pathUnder(root, p string) bool {
	ra := absOrSelf(root)
	pa := absOrSelf(p)
	rel, err := filepath.Rel(ra, pa)
	if err != nil {
		return false
	}
	return rel == "." || !strings.HasPrefix(rel, "..")
}

// absOrSelf returns the absolute form of p, falling back to p on error.
func absOrSelf(p string) string {
	if abs, err := filepath.Abs(p); err == nil {
		return abs
	}
	return p
}
