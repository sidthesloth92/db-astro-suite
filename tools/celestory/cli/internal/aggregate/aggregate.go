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
//	     dataFingerprint) + per-target ra/dec.
//	v3 — domain rename object→target: root "targets" array, targetCount/
//	     targetIds keys.
const SchemaVersion = 3

// Build is the top-level orchestrator for a single scan: enrich → assemble.
// Slices are always non-nil so the JSON arrays render as [] rather than null.
// It reports every duplicate (whole-library view); pass a dupRoot to Assemble to
// scope the report to a folder.
func Build(frames []scan.Frame, skipped []scan.Skipped, tool model.ToolInfo) model.Story {
	lights, _ := Enrich(frames)
	return Assemble(lights, skipped, tool, "", nil)
}

// Assemble turns already-enriched light frames (e.g. the cumulative union across
// every scanned disk) into the story: dedupe by FrameFP → per-target/equipment
// rollups → summary → Story.
//
// Integration is always deduped across the full input, so totals reflect the
// whole library. The duplicate report, however, is scoped to dupRoot when it is
// non-empty (only sets with a copy under that folder), so a run reports the
// duplicates of the folder it scanned rather than every disk ever seen; pass ""
// for the whole-library report. Copies the verifiable predicate rejects (paths
// on disconnected disks that cannot be checked right now) are excluded from the
// duplicate report — but never from integration; pass nil to report everything.
func Assemble(lights []LightFrame, skipped []scan.Skipped, tool model.ToolInfo, dupRoot string, verifiable func(path string) bool) model.Story {
	dup := DetectDuplicates(lights).FilterVerifiable(verifiable)
	view := dup.ScopeToRoot(dupRoot)
	targets := BuildTargets(dup.Deduped)
	equip := equipment.BuildRegistry(toUsages(dup.Deduped))
	summary := Summarize(targets, dup.Deduped, view)
	// The skipped paths are stripped from the persisted story (privacy), so the
	// count is the only signal that survives the upload — carry it in the summary.
	summary.SkippedFileCount = len(skipped)

	return model.Story{
		SchemaVersion: SchemaVersion,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		Tool:          tool,
		Summary:       summary,
		Equipment:     equip,
		Targets:       targets,
		Duplicates:    view.Sets,
		Skipped:       toSkipped(skipped),
	}
}

// BuildTargets groups light frames by target and builds each target's totals,
// per-filter integration, equipment cross-links, and per-night sessions.
func BuildTargets(lights []LightFrame) []model.TargetTimeline {
	grouped := map[string][]LightFrame{}
	var order []string
	for _, lf := range lights {
		if _, seen := grouped[lf.TargetID]; !seen {
			order = append(order, lf.TargetID)
		}
		grouped[lf.TargetID] = append(grouped[lf.TargetID], lf)
	}

	targets := make([]model.TargetTimeline, 0, len(order))
	for _, id := range order {
		targets = append(targets, buildTarget(grouped[id]))
	}

	sort.SliceStable(targets, func(i, j int) bool {
		if targets[i].TotalIntegrationSeconds != targets[j].TotalIntegrationSeconds {
			return targets[i].TotalIntegrationSeconds > targets[j].TotalIntegrationSeconds
		}
		return targets[i].DisplayName < targets[j].DisplayName
	})
	return targets
}

func buildTarget(frames []LightFrame) model.TargetTimeline {
	head := frames[0]

	nights := map[string][]LightFrame{}
	var nightOrder []string
	equipIDs := map[string]struct{}{}
	var total float64
	var first, last time.Time

	for _, lf := range frames {
		k := dateKey(lf.SessionTime)
		if _, seen := nights[k]; !seen {
			nightOrder = append(nightOrder, k)
		}
		nights[k] = append(nights[k], lf)
		total += lf.Exposure
		if id := equipment.CameraID(lf.Camera); id != "" {
			equipIDs[id] = struct{}{}
		}
		if id := equipment.TelescopeID(lf.Telescope, lf.Focal); id != "" {
			equipIDs[id] = struct{}{}
		}
		if id := equipment.MountID(lf.Telescope); id != "" {
			equipIDs[id] = struct{}{}
		}
		if !lf.SessionTime.IsZero() {
			if first.IsZero() || lf.SessionTime.Before(first) {
				first = lf.SessionTime
			}
			if lf.SessionTime.After(last) {
				last = lf.SessionTime
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

	return model.TargetTimeline{
		ID:                      head.TargetID,
		DisplayName:             head.DisplayName,
		Designation:             head.Designation,
		Aliases:                 nonNil(head.Aliases),
		Type:                    head.Type,
		Category:                head.Category,
		TotalIntegrationSeconds: total,
		LightFrameCount:         len(frames),
		NightCount:              nightCount,
		FirstLight:              dateKey(first),
		LatestSession:           dateKey(last),
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
// same camera/telescope/mount identifiers a target carries so the web app
// resolves names.
func sessionEquipmentIds(frames []LightFrame) []string {
	ids := map[string]struct{}{}
	for _, lf := range frames {
		if id := equipment.CameraID(lf.Camera); id != "" {
			ids[id] = struct{}{}
		}
		if id := equipment.TelescopeID(lf.Telescope, lf.Focal); id != "" {
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
// A night usually uses one telescope; when it mixes telescopes the dominant one wins.
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

// Summarize rolls the targets + frames into the top-level summary.
func Summarize(targets []model.TargetTimeline, lights []LightFrame, dup DuplicateReport) model.Summary {
	s := model.Summary{
		TargetCount:          len(targets),
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
		if !lf.SessionTime.IsZero() {
			if first.IsZero() || lf.SessionTime.Before(first) {
				first = lf.SessionTime
			}
			if lf.SessionTime.After(last) {
				last = lf.SessionTime
			}
		}
	}
	s.FirstLight = dateKey(first)
	s.LatestSession = dateKey(last)

	for _, name := range filterOrder {
		s.Filters = append(s.Filters, model.FilterTotal{Name: name, Seconds: filterSecs[name]})
	}
	sort.SliceStable(s.Filters, func(i, j int) bool {
		if s.Filters[i].Seconds != s.Filters[j].Seconds {
			return s.Filters[i].Seconds > s.Filters[j].Seconds
		}
		return s.Filters[i].Name < s.Filters[j].Name
	})

	s.ByCategory = byCategory(targets)
	s.Activity = activityByNight(lights)
	s.NightCount = len(s.Activity)
	return s
}

func byCategory(targets []model.TargetTimeline) []model.CategoryStat {
	type agg struct {
		targets int
		seconds float64
		frames  int
	}
	cats := map[string]*agg{}
	var order []string
	for _, o := range targets {
		a := cats[o.Category]
		if a == nil {
			a = &agg{}
			cats[o.Category] = a
			order = append(order, o.Category)
		}
		a.targets++
		a.seconds += o.TotalIntegrationSeconds
		a.frames += o.LightFrameCount
	}
	out := make([]model.CategoryStat, 0, len(order))
	for _, c := range order {
		a := cats[c]
		out = append(out, model.CategoryStat{
			Category:           c,
			TargetCount:        a.targets,
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
		targets map[string]struct{}
	}
	nights := map[string]*agg{}
	var order []string
	for _, lf := range lights {
		k := dateKey(lf.SessionTime)
		if k == "" {
			continue
		}
		a := nights[k]
		if a == nil {
			a = &agg{targets: map[string]struct{}{}}
			nights[k] = a
			order = append(order, k)
		}
		a.seconds += lf.Exposure
		a.frames++
		a.targets[lf.TargetID] = struct{}{}
	}
	sort.Strings(order)
	out := make([]model.ActivityEntry, 0, len(order))
	for _, k := range order {
		a := nights[k]
		out = append(out, model.ActivityEntry{
			Date:               k,
			IntegrationSeconds: a.seconds,
			LightFrameCount:    a.frames,
			TargetIds:          sortedSet(a.targets),
		})
	}
	return out
}

func toUsages(lights []LightFrame) []equipment.Usage {
	out := make([]equipment.Usage, 0, len(lights))
	for _, lf := range lights {
		out = append(out, equipment.Usage{
			TargetID:        lf.TargetID,
			CameraRaw:       lf.Camera,
			Telescope:       lf.Telescope,
			Focal:           lf.Focal,
			FRatio:          lf.FRatio,
			IsOSC:           lf.IsOSC,
			ExposureSeconds: lf.Exposure,
			Date:            lf.SessionTime,
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

