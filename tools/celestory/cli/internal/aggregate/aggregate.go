package aggregate

import (
	"sort"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/equipment"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
)

// SchemaVersion is the version of the JSON contract this build emits. Bump it
// whenever the celestory.json shape changes incompatibly so the web app can
// detect files from an older CLI and prompt the user to regenerate.
//
//	v2 — frame-fingerprint dedup + identity fields (installId/profileId/
//	     dataFingerprint) + per-object ra/dec.
const SchemaVersion = 2

// Build is the top-level orchestrator for a single scan: enrich → assemble.
// Slices are always non-nil so the JSON arrays render as [] rather than null.
// It reports every duplicate (whole-library view); pass a dupRoot to Assemble to
// scope the report to a folder.
func Build(frames []scan.Frame, skipped []scan.Skipped, tool model.ToolInfo) model.Story {
	lights, _ := Enrich(frames)
	return Assemble(lights, skipped, tool, "")
}

// Assemble turns already-enriched light frames (e.g. the cumulative union across
// every scanned disk) into the story: dedupe by FrameFP → per-object/equipment
// rollups → summary → Story.
//
// Integration is always deduped across the full input, so totals reflect the
// whole library. The duplicate report, however, is scoped to dupRoot when it is
// non-empty (only sets with a copy under that folder), so a run reports the
// duplicates of the folder it scanned rather than every disk ever seen; pass ""
// for the whole-library report.
func Assemble(lights []LightFrame, skipped []scan.Skipped, tool model.ToolInfo, dupRoot string) model.Story {
	dup := DetectDuplicates(lights)
	view := dup.ScopeToRoot(dupRoot)
	objects := BuildObjects(dup.Deduped)
	equip := equipment.BuildRegistry(toUsages(dup.Deduped))
	summary := Summarize(objects, dup.Deduped, view)
	// The skipped paths are stripped from the persisted story (privacy), so the
	// count is the only signal that survives the upload — carry it in the summary.
	summary.SkippedFileCount = len(skipped)

	return model.Story{
		SchemaVersion: SchemaVersion,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		Tool:          tool,
		Summary:       summary,
		Equipment:     equip,
		Objects:       objects,
		Duplicates:    view.Sets,
		Skipped:       toSkipped(skipped),
	}
}

// BuildObjects groups light frames by object and builds each object's totals,
// per-filter integration, equipment cross-links, and per-night sessions.
func BuildObjects(lights []LightFrame) []model.ObjectTimeline {
	grouped := map[string][]LightFrame{}
	var order []string
	for _, lf := range lights {
		if _, seen := grouped[lf.ObjectID]; !seen {
			order = append(order, lf.ObjectID)
		}
		grouped[lf.ObjectID] = append(grouped[lf.ObjectID], lf)
	}

	objects := make([]model.ObjectTimeline, 0, len(order))
	for _, id := range order {
		objects = append(objects, buildObject(grouped[id]))
	}

	sort.SliceStable(objects, func(i, j int) bool {
		if objects[i].TotalIntegrationSeconds != objects[j].TotalIntegrationSeconds {
			return objects[i].TotalIntegrationSeconds > objects[j].TotalIntegrationSeconds
		}
		return objects[i].DisplayName < objects[j].DisplayName
	})
	return objects
}

func buildObject(frames []LightFrame) model.ObjectTimeline {
	head := frames[0]

	nights := map[string][]LightFrame{}
	var nightOrder []string
	equipIDs := map[string]struct{}{}
	var total float64
	var first, last time.Time

	for _, lf := range frames {
		k := dateKey(lf.Date)
		if _, seen := nights[k]; !seen {
			nightOrder = append(nightOrder, k)
		}
		nights[k] = append(nights[k], lf)
		total += lf.Exposure
		if id := equipment.CameraID(lf.Camera); id != "" {
			equipIDs[id] = struct{}{}
		}
		if id := equipment.OpticID(lf.Telescope, lf.Focal); id != "" {
			equipIDs[id] = struct{}{}
		}
		if id := equipment.MountID(lf.Telescope); id != "" {
			equipIDs[id] = struct{}{}
		}
		if !lf.Date.IsZero() {
			if first.IsZero() || lf.Date.Before(first) {
				first = lf.Date
			}
			if lf.Date.After(last) {
				last = lf.Date
			}
		}
	}

	nightCount := 0
	for _, k := range nightOrder {
		if k != "" {
			nightCount++
		}
	}

	// Representative pointing: the first frame that carries coordinates.
	var ra, dec *float64
	for _, lf := range frames {
		if lf.RA != nil && lf.Dec != nil {
			ra, dec = lf.RA, lf.Dec
			break
		}
	}

	sessions := make([]model.Session, 0, len(nightOrder))
	for _, k := range nightOrder {
		sessions = append(sessions, buildSession(k, nights[k]))
	}
	sort.SliceStable(sessions, func(i, j int) bool {
		// Dated sessions ascending; undated ("") sorts last.
		if (sessions[i].Date == "") != (sessions[j].Date == "") {
			return sessions[j].Date == ""
		}
		return sessions[i].Date < sessions[j].Date
	})

	return model.ObjectTimeline{
		ID:                      head.ObjectID,
		DisplayName:             head.DisplayName,
		Designation:             head.Designation,
		Aliases:                 nonNil(head.Aliases),
		Type:                    head.Type,
		Category:                head.Category,
		TotalIntegrationSeconds: total,
		LightFrameCount:         len(frames),
		NightCount:              nightCount,
		FirstLight:              dateString(first),
		LatestSession:           dateString(last),
		RA:                      ra,
		Dec:                     dec,
		Filters:                 filterIntegration(frames),
		EquipmentIds:            sortedSet(equipIDs),
		Sessions:                sessions,
		Image:                   nil,
	}
}

func buildSession(key string, frames []LightFrame) model.Session {
	var total float64
	for _, lf := range frames {
		total += lf.Exposure
	}
	focal, fratio := sessionFocalRatio(frames)
	return model.Session{
		Date:               key,
		IntegrationSeconds: total,
		LightFrameCount:    len(frames),
		Filters:            filterIntegration(frames),
		EquipmentIds:       sessionEquipmentIds(frames),
		FocalLengthMm:      focal,
		FRatio:             fratio,
	}
}

// sessionEquipmentIds derives the night's gear as story equipment ids, using the
// same camera/optic/mount identifiers an object carries so the web app resolves
// names.
func sessionEquipmentIds(frames []LightFrame) []string {
	ids := map[string]struct{}{}
	for _, lf := range frames {
		if id := equipment.CameraID(lf.Camera); id != "" {
			ids[id] = struct{}{}
		}
		if id := equipment.OpticID(lf.Telescope, lf.Focal); id != "" {
			ids[id] = struct{}{}
		}
		if id := equipment.MountID(lf.Telescope); id != "" {
			ids[id] = struct{}{}
		}
	}
	return sortedSet(ids)
}

// sessionFocalRatio returns the night's representative focal length (mm) and
// f-ratio — the values carrying the most integration time — or nil when unknown.
// A night usually uses one optic; when it mixes optics the dominant one wins.
func sessionFocalRatio(frames []LightFrame) (focal, fratio *float64) {
	focalSecs := map[float64]float64{}
	fratioSecs := map[float64]float64{}
	for _, lf := range frames {
		if lf.Focal > 0 {
			focalSecs[lf.Focal] += lf.Exposure
		}
		if lf.FRatio > 0 {
			fratioSecs[lf.FRatio] += lf.Exposure
		}
	}
	if v, ok := dominantValue(focalSecs); ok {
		focal = &v
	}
	if v, ok := dominantValue(fratioSecs); ok {
		fratio = &v
	}
	return focal, fratio
}

// dominantValue returns the key carrying the most accumulated seconds (ties
// broken by the larger key for determinism), and whether the map had any entry.
func dominantValue(byValue map[float64]float64) (float64, bool) {
	var best, bestSecs float64
	found := false
	for v, secs := range byValue {
		if !found || secs > bestSecs || (secs == bestSecs && v > best) {
			best, bestSecs, found = v, secs, true
		}
	}
	return best, found
}

// filterIntegration aggregates frames into per-filter seconds + frame counts,
// ordered by seconds descending then name.
func filterIntegration(frames []LightFrame) []model.FilterIntegration {
	type agg struct {
		seconds float64
		frames  int
	}
	byFilter := map[string]*agg{}
	var order []string
	for _, lf := range frames {
		a := byFilter[lf.Filter]
		if a == nil {
			a = &agg{}
			byFilter[lf.Filter] = a
			order = append(order, lf.Filter)
		}
		a.seconds += lf.Exposure
		a.frames++
	}
	out := make([]model.FilterIntegration, 0, len(order))
	for _, name := range order {
		a := byFilter[name]
		out = append(out, model.FilterIntegration{Name: name, Seconds: a.seconds, Frames: a.frames})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Seconds != out[j].Seconds {
			return out[i].Seconds > out[j].Seconds
		}
		return out[i].Name < out[j].Name
	})
	return out
}

// Summarize rolls the objects + frames into the top-level summary.
func Summarize(objects []model.ObjectTimeline, lights []LightFrame, dup DuplicateReport) model.Summary {
	s := model.Summary{
		ObjectCount:          len(objects),
		Filters:              []model.FilterTotal{},
		ByCategory:           []model.CategoryStat{},
		Activity:             []model.ActivityEntry{},
		DuplicateFileCount:   dup.FileCount,
		DuplicateWastedBytes: dup.WastedBytes,
	}

	var first, last time.Time
	filterSecs := map[string]float64{}
	var filterOrder []string
	for _, lf := range lights {
		s.TotalIntegrationSeconds += lf.Exposure
		s.LightFrameCount++
		if _, seen := filterSecs[lf.Filter]; !seen {
			filterOrder = append(filterOrder, lf.Filter)
		}
		filterSecs[lf.Filter] += lf.Exposure
		if !lf.Date.IsZero() {
			if first.IsZero() || lf.Date.Before(first) {
				first = lf.Date
			}
			if lf.Date.After(last) {
				last = lf.Date
			}
		}
	}
	s.FirstLight = dateString(first)
	s.LatestSession = dateString(last)

	for _, name := range filterOrder {
		s.Filters = append(s.Filters, model.FilterTotal{Name: name, Seconds: filterSecs[name]})
	}
	sort.SliceStable(s.Filters, func(i, j int) bool {
		if s.Filters[i].Seconds != s.Filters[j].Seconds {
			return s.Filters[i].Seconds > s.Filters[j].Seconds
		}
		return s.Filters[i].Name < s.Filters[j].Name
	})

	s.ByCategory = byCategory(objects)
	s.Activity = activityByNight(lights)
	s.NightCount = len(s.Activity)
	return s
}

func byCategory(objects []model.ObjectTimeline) []model.CategoryStat {
	type agg struct {
		objects int
		seconds float64
		frames  int
	}
	cats := map[string]*agg{}
	var order []string
	for _, o := range objects {
		a := cats[o.Category]
		if a == nil {
			a = &agg{}
			cats[o.Category] = a
			order = append(order, o.Category)
		}
		a.objects++
		a.seconds += o.TotalIntegrationSeconds
		a.frames += o.LightFrameCount
	}
	out := make([]model.CategoryStat, 0, len(order))
	for _, c := range order {
		a := cats[c]
		out = append(out, model.CategoryStat{
			Category:           c,
			ObjectCount:        a.objects,
			IntegrationSeconds: a.seconds,
			LightFrameCount:    a.frames,
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].IntegrationSeconds != out[j].IntegrationSeconds {
			return out[i].IntegrationSeconds > out[j].IntegrationSeconds
		}
		return out[i].Category < out[j].Category
	})
	return out
}

func activityByNight(lights []LightFrame) []model.ActivityEntry {
	type agg struct {
		seconds float64
		frames  int
		objects map[string]struct{}
	}
	nights := map[string]*agg{}
	var order []string
	for _, lf := range lights {
		k := dateKey(lf.Date)
		if k == "" {
			continue
		}
		a := nights[k]
		if a == nil {
			a = &agg{objects: map[string]struct{}{}}
			nights[k] = a
			order = append(order, k)
		}
		a.seconds += lf.Exposure
		a.frames++
		a.objects[lf.ObjectID] = struct{}{}
	}
	sort.Strings(order)
	out := make([]model.ActivityEntry, 0, len(order))
	for _, k := range order {
		a := nights[k]
		out = append(out, model.ActivityEntry{
			Date:               k,
			IntegrationSeconds: a.seconds,
			LightFrameCount:    a.frames,
			ObjectIds:          sortedSet(a.objects),
		})
	}
	return out
}

func toUsages(lights []LightFrame) []equipment.Usage {
	out := make([]equipment.Usage, 0, len(lights))
	for _, lf := range lights {
		out = append(out, equipment.Usage{
			ObjectID:        lf.ObjectID,
			CameraRaw:       lf.Camera,
			Telescope:       lf.Telescope,
			Focal:           lf.Focal,
			FRatio:          lf.FRatio,
			ExposureSeconds: lf.Exposure,
			Date:            lf.Date,
		})
	}
	return out
}

func toSkipped(skipped []scan.Skipped) []model.SkippedEntry {
	out := make([]model.SkippedEntry, 0, len(skipped))
	for _, s := range skipped {
		out = append(out, model.SkippedEntry{Path: s.Path, Reason: s.Reason})
	}
	return out
}

func sortedSet(set map[string]struct{}) []string {
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func dateString(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format("2006-01-02")
}
