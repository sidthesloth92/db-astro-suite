package aggregate

import (
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
)

func frame(path, target, filter, frameType, camera string, exp float64, size int64, date time.Time) scan.Frame {
	return scan.Frame{
		Path: path,
		Size: size,
		Meta: astrofits.Metadata{
			FrameType: frameType,
			Target:    target,
			Filter:    filter,
			CameraRaw: camera,
			Telescope: "William Optics RedCat 51",
			Focal:     250,
			HasFocal:  true,
			Exposure:  exp,
			DateObs:   date,
		},
	}
}

func findTarget(targets []model.TargetTimeline, id string) *model.TargetTimeline {
	for i := range targets {
		if targets[i].ID == id {
			return &targets[i]
		}
	}
	return nil
}

func TestTargetCoordsHybrid(t *testing.T) {
	// Distinct dates so the (target-independent) frame fingerprint keeps all three.
	d1 := time.Date(2025, 1, 2, 3, 0, 0, 0, time.UTC)
	d2 := time.Date(2025, 1, 3, 3, 0, 0, 0, time.UTC)
	d3 := time.Date(2025, 1, 4, 3, 0, 0, 0, time.UTC)

	// Frame carrying explicit FITS coords (should win over the catalog).
	fitsM31 := frame("/a/m31.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1000, d1)
	fitsM31.Meta.HasCoords = true
	fitsM31.Meta.RA = 11.5
	fitsM31.Meta.Dec = 42.0

	// Catalog-only (no FITS coords) → falls back to the seed catalog.
	catM13 := frame("/a/m13.fits", "M13", "Ha", "Light", "ZWO ASI2600MM", 300, 1001, d2)
	// Unknown freeform target with no coords → none.
	unknown := frame("/a/x.fits", "My Backyard Field", "OSC", "Light", "ZWO ASI2600MC", 120, 1002, d3)

	led := Build([]scan.Frame{fitsM31, catM13, unknown}, nil, model.ToolInfo{})

	m31 := findTarget(led.Targets, "m31")
	if m31 == nil || m31.RA == nil || m31.Dec == nil {
		t.Fatalf("m31 coords missing: %+v", m31)
	}
	if *m31.RA != 11.5 || *m31.Dec != 42.0 {
		t.Errorf("m31 used %v/%v, want FITS coords 11.5/42.0 (FITS must win)", *m31.RA, *m31.Dec)
	}

	m13 := findTarget(led.Targets, "m13")
	if m13 == nil || m13.RA == nil || m13.Dec == nil {
		t.Fatalf("m13 catalog coords missing: %+v", m13)
	}
	if *m13.RA < 250 || *m13.RA > 251 || *m13.Dec < 36 || *m13.Dec > 37 {
		t.Errorf("m13 catalog coords %v/%v, want ≈250.4/+36.5", *m13.RA, *m13.Dec)
	}

	x := findTarget(led.Targets, "mybackyardfield")
	if x == nil {
		t.Fatalf("unknown target not found")
	}
	if x.RA != nil || x.Dec != nil {
		t.Errorf("unknown target got coords %v/%v, want none", x.RA, x.Dec)
	}
}

func TestBuildIntegrationAndCalibrationExclusion(t *testing.T) {
	n1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	// Distinct DATE-OBS on the same night: two real consecutive subs never share
	// an exposure-start instant, and the FrameFP identity is timestamp-based.
	n1b := time.Date(2025, 8, 1, 22, 5, 0, 0, time.UTC)
	n2 := time.Date(2025, 8, 2, 22, 0, 0, 0, time.UTC)
	frames := []scan.Frame{
		frame("/a/l1.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1000, n1),
		frame("/a/l2.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1001, n1b),
		frame("/a/l3.fits", "M 31", "OIII", "Light", "ZWO ASI2600MM", 300, 1002, n2),
		frame("/a/d1.fits", "", "", "Dark", "ZWO ASI2600MM", 300, 1003, n1),
		frame("/a/b1.fits", "", "", "Bias", "ZWO ASI2600MM", 0, 1004, n1),
	}

	led := Build(frames, nil, model.ToolInfo{Name: "celestory", Version: "test"})

	if led.Summary.TargetCount != 1 {
		t.Fatalf("TargetCount = %d, want 1 (calibration must not create targets)", led.Summary.TargetCount)
	}
	m31 := findTarget(led.Targets, "m31")
	if m31 == nil {
		t.Fatal("expected target m31")
	}
	if m31.TotalIntegrationSeconds != 900 {
		t.Errorf("M31 integration = %v, want 900 (3 lights × 300; calibration excluded)", m31.TotalIntegrationSeconds)
	}
	if m31.LightFrameCount != 3 {
		t.Errorf("M31 lightFrameCount = %d, want 3", m31.LightFrameCount)
	}
	if len(m31.Sessions) != 2 {
		t.Errorf("M31 sessions = %d, want 2 nights", len(m31.Sessions))
	}
	if m31.NightCount != 2 {
		t.Errorf("M31 nightCount = %d, want 2", m31.NightCount)
	}
	if led.Summary.NightCount != 2 {
		t.Errorf("NightCount = %d, want 2", led.Summary.NightCount)
	}
	// Equipment registry should hold one camera + one telescope, both cross-linked.
	if len(led.Equipment) != 2 {
		t.Fatalf("equipment count = %d, want 2 (camera + telescope)", len(led.Equipment))
	}
	for _, e := range led.Equipment {
		if len(e.TargetIds) != 1 || e.TargetIds[0] != "m31" {
			t.Errorf("equipment %q targetIds = %v, want [m31]", e.ID, e.TargetIds)
		}
	}
}

func TestDuplicateDetectionCountsOnceAndReports(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	frames := []scan.Frame{
		frame("/data/sub_0007.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
		frame("/backup/sub_0007.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
	}
	led := Build(frames, nil, model.ToolInfo{})

	m31 := findTarget(led.Targets, "m31")
	if m31 == nil || m31.LightFrameCount != 1 {
		t.Fatalf("duplicate copy must be counted once; got %+v", m31)
	}
	if led.Summary.DuplicateFileCount != 1 {
		t.Errorf("DuplicateFileCount = %d, want 1", led.Summary.DuplicateFileCount)
	}
	if led.Summary.DuplicateWastedBytes != 52000000 {
		t.Errorf("DuplicateWastedBytes = %d, want 52000000", led.Summary.DuplicateWastedBytes)
	}
	if len(led.Duplicates) != 1 || len(led.Duplicates[0].Paths) != 2 {
		t.Errorf("expected one duplicate set with two paths, got %+v", led.Duplicates)
	}
}

func TestSameExposureDifferentSizeCountsOnce(t *testing.T) {
	// A re-saved/re-compressed copy of the same exposure has a different file
	// size; the FrameFP excludes size, so it must still be counted once (the old
	// size-based key would have wrongly counted two).
	d := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	frames := []scan.Frame{
		frame("/raw/sub_0007.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
		frame("/proc/sub_0007.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d),
	}
	led := Build(frames, nil, model.ToolInfo{})

	m31 := findTarget(led.Targets, "m31")
	if m31 == nil || m31.LightFrameCount != 1 {
		t.Fatalf("same exposure at a different size must count once; got %+v", m31)
	}
	if led.Summary.DuplicateFileCount != 1 {
		t.Errorf("DuplicateFileCount = %d, want 1", led.Summary.DuplicateFileCount)
	}
}

func TestDistinctSubsNotFlaggedAsDuplicates(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	d2 := time.Date(2025, 8, 1, 22, 19, 3, 0, time.UTC) // different DATE-OBS
	frames := []scan.Frame{
		frame("/data/sub_0007.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/data/sub_0008.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d2),
	}
	led := Build(frames, nil, model.ToolInfo{})
	if led.Summary.DuplicateFileCount != 0 {
		t.Errorf("distinct subs must not be flagged; DuplicateFileCount = %d", led.Summary.DuplicateFileCount)
	}
	m31 := findTarget(led.Targets, "m31")
	if m31 == nil || m31.LightFrameCount != 2 {
		t.Fatalf("both distinct subs should count; got %+v", m31)
	}
}

func TestAssembleScopesDuplicatesToFolder(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	d2 := time.Date(2025, 8, 2, 22, 14, 3, 0, time.UTC)
	// A sub backed up across folderA and folderB (a cross-folder duplicate), plus a
	// separate duplicate sitting entirely inside folderC.
	frames := []scan.Frame{
		frame("/folderA/sub.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/folderB/sub.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/folderC/a.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
		frame("/folderC/b.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
	}
	lights, _ := Enrich(frames)

	// Scoped to folderA: only the set touching folderA is reported (folderC hidden),
	// but both exposures are still deduped and counted once.
	scoped := Assemble(lights, nil, model.ToolInfo{}, "/folderA", nil)
	if len(scoped.Duplicates) != 1 {
		t.Fatalf("scoped duplicate sets = %d, want 1 (folderC set hidden)", len(scoped.Duplicates))
	}
	if scoped.Summary.DuplicateFileCount != 1 {
		t.Errorf("scoped DuplicateFileCount = %d, want 1", scoped.Summary.DuplicateFileCount)
	}
	if scoped.Summary.LightFrameCount != 2 || scoped.Summary.TotalIntegrationSeconds != 600 {
		t.Errorf("integration must stay full-library; frames=%d total=%v, want 2/600",
			scoped.Summary.LightFrameCount, scoped.Summary.TotalIntegrationSeconds)
	}

	// Whole-library view ("") reports both duplicate sets; integration is identical.
	all := Assemble(lights, nil, model.ToolInfo{}, "", nil)
	if len(all.Duplicates) != 2 {
		t.Errorf("whole-library duplicate sets = %d, want 2", len(all.Duplicates))
	}
	if all.Summary.DuplicateFileCount != 2 {
		t.Errorf("whole-library DuplicateFileCount = %d, want 2", all.Summary.DuplicateFileCount)
	}
	if all.Summary.LightFrameCount != 2 || all.Summary.TotalIntegrationSeconds != 600 {
		t.Errorf("integration identical scoped vs all; frames=%d total=%v, want 2/600",
			all.Summary.LightFrameCount, all.Summary.TotalIntegrationSeconds)
	}
}

func TestOutsideRootDuplicateSetsCountsHidden(t *testing.T) {
	d1 := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	d2 := time.Date(2025, 8, 2, 22, 14, 3, 0, time.UTC)
	frames := []scan.Frame{
		frame("/folderA/sub.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/folderB/sub.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d1),
		frame("/folderC/a.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
		frame("/folderC/b.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 41000000, d2),
	}
	lights, _ := Enrich(frames)

	if got := OutsideRootDuplicateSets(lights, "/folderA", nil); got != 1 {
		t.Errorf("scoped to folderA hides the folderC set; got %d, want 1", got)
	}
	if got := OutsideRootDuplicateSets(lights, "/folderC", nil); got != 1 {
		t.Errorf("scoped to folderC hides the A/B set; got %d, want 1", got)
	}
	if got := OutsideRootDuplicateSets(lights, "", nil); got != 0 {
		t.Errorf("whole-library view hides nothing; got %d, want 0", got)
	}
}

func TestAssembleCountsSkipped(t *testing.T) {
	skipped := []scan.Skipped{
		{Path: "/a/x.fits", Reason: "bad header"},
		{Path: "/a/y.fits", Reason: "unexpected EOF"},
	}
	led := Build(nil, skipped, model.ToolInfo{})
	if led.Summary.SkippedFileCount != 2 {
		t.Errorf("SkippedFileCount = %d, want 2", led.Summary.SkippedFileCount)
	}
	// At the aggregate layer the entries (with paths) are still present; stripping
	// them for the uploaded file happens at write time in the CLI.
	if len(led.Skipped) != 2 {
		t.Errorf("story.Skipped len = %d, want 2 (stripping happens at write time)", len(led.Skipped))
	}
}

func TestScopeToRootFiltersAndRetotals(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 14, 3, 0, time.UTC)
	frames := []scan.Frame{
		frame("/folderA/sub.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
		frame("/folderB/sub.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 52000000, d),
	}
	lights, _ := Enrich(frames)
	rep := DetectDuplicates(lights)
	if len(rep.Sets) != 1 || rep.FileCount != 1 {
		t.Fatalf("setup: sets=%d fileCount=%d, want 1/1", len(rep.Sets), rep.FileCount)
	}

	if got := rep.ScopeToRoot(""); len(got.Sets) != 1 {
		t.Errorf("empty root must pass through; sets=%d, want 1", len(got.Sets))
	}
	none := rep.ScopeToRoot("/elsewhere")
	if len(none.Sets) != 0 || none.FileCount != 0 || none.WastedBytes != 0 {
		t.Errorf("non-matching root must drop the set; sets=%d fileCount=%d wasted=%d",
			len(none.Sets), none.FileCount, none.WastedBytes)
	}
	hit := rep.ScopeToRoot("/folderB")
	if len(hit.Sets) != 1 || hit.FileCount != 1 || hit.WastedBytes != 52000000 {
		t.Errorf("matching root keeps set; sets=%d fileCount=%d wasted=%d, want 1/1/52000000",
			len(hit.Sets), hit.FileCount, hit.WastedBytes)
	}
}

// mountFrame builds a light frame whose TELESCOP carries a mount name (the
// EQMOD/ASCOM case) plus a real focal length / f-ratio.
func mountFrame(path string, exp float64, size int64, date time.Time) scan.Frame {
	return scan.Frame{
		Path: path,
		Size: size,
		Meta: astrofits.Metadata{
			FrameType: "Light",
			Target:    "M31",
			Filter:    "Ha",
			CameraRaw: "ZWO ASI2600MM",
			Telescope: "EQMod Mount",
			Focal:     700,
			HasFocal:  true,
			FRatio:    4.9,
			Exposure:  exp,
			DateObs:   date,
		},
	}
}

func TestMountSeparatedFromTelescopeWithSessionSpecs(t *testing.T) {
	n1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	n1b := time.Date(2025, 8, 1, 22, 5, 0, 0, time.UTC)
	frames := []scan.Frame{
		mountFrame("/a/l1.fits", 300, 1000, n1),
		mountFrame("/a/l2.fits", 300, 1001, n1b),
	}

	led := Build(frames, nil, model.ToolInfo{Name: "celestory", Version: "test"})

	// Registry: one camera + one mount, and NO telescope (the mount must not be
	// surfaced as an unnamed focal-length telescope).
	kinds := map[string]int{}
	var mount *model.EquipmentItem
	for i := range led.Equipment {
		kinds[led.Equipment[i].Kind]++
		if led.Equipment[i].Kind == "mount" {
			mount = &led.Equipment[i]
		}
	}
	if kinds["camera"] != 1 || kinds["mount"] != 1 || kinds["telescope"] != 0 {
		t.Fatalf("equipment kinds = %v, want camera:1 mount:1 telescope:0", kinds)
	}
	if mount.DisplayName != "EQMod Mount" || mount.FocalLengthMm != nil {
		t.Errorf("mount entry = %+v, want name 'EQMod Mount' and nil focal", mount)
	}

	// Target cross-links the mount id (and the camera), never a telescope id.
	m31 := findTarget(led.Targets, "m31")
	if m31 == nil {
		t.Fatal("expected target m31")
	}
	if !containsID(m31.EquipmentIds, "mount-eqmod-mount") || !containsID(m31.EquipmentIds, "cam-2600mm") {
		t.Errorf("target equipmentIds = %v, want to include mount-eqmod-mount and cam-2600mm", m31.EquipmentIds)
	}
	for _, id := range m31.EquipmentIds {
		if len(id) >= 10 && id[:10] == "telescope-" {
			t.Errorf("target equipmentIds must not include a telescope, got %q", id)
		}
	}

	// The telescope spec moves onto the session.
	if len(m31.Sessions) != 1 {
		t.Fatalf("sessions = %d, want 1", len(m31.Sessions))
	}
	s := m31.Sessions[0]
	if s.FocalLengthMm == nil || *s.FocalLengthMm != 700 {
		t.Errorf("session focalLengthMm = %v, want 700", s.FocalLengthMm)
	}
	if s.FRatio == nil || *s.FRatio != 4.9 {
		t.Errorf("session fRatio = %v, want 4.9", s.FRatio)
	}
}

func containsID(ids []string, want string) bool {
	for _, id := range ids {
		if id == want {
			return true
		}
	}
	return false
}

func TestUndatedFrameStillCounts(t *testing.T) {
	frames := []scan.Frame{
		frame("/a/u1.fits", "M42", "OSC", "Light", "ZWO ASI2600MC", 120, 2000, time.Time{}),
	}
	led := Build(frames, nil, model.ToolInfo{})
	m42 := findTarget(led.Targets, "m42")
	if m42 == nil {
		t.Fatal("undated light frame must still produce its target")
	}
	if m42.TotalIntegrationSeconds != 120 {
		t.Errorf("undated integration = %v, want 120", m42.TotalIntegrationSeconds)
	}
	if len(m42.Sessions) != 1 || m42.Sessions[0].Date != "" {
		t.Errorf("undated frame should land in an empty-date session, got %+v", m42.Sessions)
	}
	if m42.NightCount != 0 {
		t.Errorf("undated-only target nightCount = %d, want 0 (undated isn't a night)", m42.NightCount)
	}
}

func TestSessionDatesUseLocalCaptureTimeChain(t *testing.T) {
	// Captured 21:00 local on Aug 1; the UTC DATE-OBS has already rolled into
	// Aug 2. The filename's local time must date the session (no UTC day split).
	byName := frame("/a/M31_Ha_20250801-210029_0001.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1000,
		time.Date(2025, 8, 2, 2, 0, 22, 0, time.UTC))

	// No filename token → the DATE-LOC header (local wall clock) wins over DATE-OBS.
	byLoc := frame("/a/m31_sub2.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1001,
		time.Date(2025, 8, 3, 1, 30, 0, 0, time.UTC))
	byLoc.Meta.DateLoc = time.Date(2025, 8, 2, 20, 30, 0, 0, time.UTC)

	// After local midnight the literal calendar date applies — no observing-night
	// rollover merges it into the previous evening.
	afterMidnight := frame("/a/M31_Ha_20250804-013000_0001.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1002,
		time.Date(2025, 8, 4, 5, 30, 0, 0, time.UTC))

	// An implausible filename time (years away — batch rename) is rejected and
	// the frame falls back to its DATE-OBS date.
	bogus := frame("/a/m31_20200101-120000_0001.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1003,
		time.Date(2025, 8, 5, 22, 0, 0, 0, time.UTC))

	led := Build([]scan.Frame{byName, byLoc, afterMidnight, bogus}, nil, model.ToolInfo{})

	m31 := findTarget(led.Targets, "m31")
	if m31 == nil {
		t.Fatal("expected target m31")
	}
	want := []string{"2025-08-01", "2025-08-02", "2025-08-04", "2025-08-05"}
	if len(m31.Sessions) != len(want) {
		t.Fatalf("sessions = %d, want %d: %+v", len(m31.Sessions), len(want), m31.Sessions)
	}
	for i, w := range want {
		if m31.Sessions[i].Date != w {
			t.Errorf("session[%d].Date = %q, want %q", i, m31.Sessions[i].Date, w)
		}
	}
	if m31.FirstLight != "2025-08-01" {
		t.Errorf("FirstLight = %q, want 2025-08-01 (local capture date, not UTC)", m31.FirstLight)
	}
	if m31.LatestSession != "2025-08-05" {
		t.Errorf("LatestSession = %q, want 2025-08-05", m31.LatestSession)
	}
	if led.Summary.FirstLight != "2025-08-01" || led.Summary.LatestSession != "2025-08-05" {
		t.Errorf("summary first/latest = %q/%q, want 2025-08-01/2025-08-05",
			led.Summary.FirstLight, led.Summary.LatestSession)
	}
}

func TestDuplicateReportKeepsUTCDateObs(t *testing.T) {
	// The duplicate report identifies frames by their raw DATE-OBS instant; the
	// session-date chain must not leak the local filename time into it.
	obs := time.Date(2025, 8, 2, 2, 0, 22, 0, time.UTC)
	a := frame("/a/M31_Ha_20250801-210029_0001.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1000, obs)
	b := frame("/b/M31_Ha_20250801-210029_0001.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1000, obs)

	lights, dropped := Enrich([]scan.Frame{a, b})
	if dropped != 0 || len(lights) != 2 {
		t.Fatalf("enrich: %d lights, %d dropped, want 2/0", len(lights), dropped)
	}
	rep := DetectDuplicates(lights)
	if len(rep.Sets) != 1 {
		t.Fatalf("duplicate sets = %d, want 1", len(rep.Sets))
	}
	if rep.Sets[0].DateObs != "2025-08-02T02:00:22Z" {
		t.Errorf("DuplicateSet.DateObs = %q, want the raw UTC DATE-OBS 2025-08-02T02:00:22Z", rep.Sets[0].DateObs)
	}
	if got := dateKey(lights[0].SessionTime); got != "2025-08-01" {
		t.Errorf("session key = %q, want 2025-08-01 (local filename time)", got)
	}
}
