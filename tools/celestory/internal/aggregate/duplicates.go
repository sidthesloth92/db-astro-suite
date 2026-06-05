package aggregate

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/internal/model"
)

// DuplicateReport is the outcome of duplicate detection.
type DuplicateReport struct {
	Deduped     []LightFrame         // one frame per set + all singletons + undated
	Sets        []model.DuplicateSet // each set of identical copies at >1 path
	WastedBytes int64                // redundant disk used by the extra copies
	FileCount   int                  // number of redundant copies (sum of len-1)
}

// DetectDuplicates finds copies of the same sub at different paths using an
// acquisition-identity key (object + exact DATE-OBS + camera + filter + size)
// that needs no content hashing. Undated frames can't be keyed reliably, so
// they are passed through untouched. One frame per set is kept (the
// lexicographically-first path); the rest are excluded from aggregation but
// reported.
func DetectDuplicates(lights []LightFrame) DuplicateReport {
	groups := map[string][]int{}
	for i, lf := range lights {
		if lf.Date.IsZero() {
			continue
		}
		groups[dupKey(lf)] = append(groups[dupKey(lf)], i)
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
			DateObs:     first.Date.UTC().Format(time.RFC3339),
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

func dupKey(lf LightFrame) string {
	return strings.Join([]string{
		lf.ObjectID,
		lf.Date.UTC().Format(time.RFC3339Nano),
		lf.Camera,
		lf.Filter,
		strconv.FormatInt(lf.Size, 10),
	}, "|")
}
