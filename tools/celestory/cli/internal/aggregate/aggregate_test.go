package aggregate

import (
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
)

func frame(path, object, filter, frameType, camera string, exp float64, size int64, date time.Time) scan.Frame {
	return scan.Frame{
		Path: path,
		Size: size,
		Meta: astrofits.Metadata{
			FrameType: frameType,
			Target:    object,
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

func findObject(objs []model.ObjectTimeline, id string) *model.ObjectTimeline {
	for i := range objs {
		if objs[i].ID == id {
			return &objs[i]
		}
	}
	return nil
}

func TestObjectCoordsHybrid(t *testing.T) {
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

	m31 := findObject(led.Objects, "m31")
	if m31 == nil || m31.RA == nil || m31.Dec == nil {
		t.Fatalf("m31 coords missing: %+v", m31)
	}
	if *m31.RA != 11.5 || *m31.Dec != 42.0 {
		t.Errorf("m31 used %v/%v, want FITS coords 11.5/42.0 (FITS must win)", *m31.RA, *m31.Dec)
	}

	m13 := findObject(led.Objects, "m13")
	if m13 == nil || m13.RA == nil || m13.Dec == nil {
		t.Fatalf("m13 catalog coords missing: %+v", m13)
	}
	if *m13.RA < 250 || *m13.RA > 251 || *m13.Dec < 36 || *m13.Dec > 37 {
		t.Errorf("m13 catalog coords %v/%v, want ≈250.4/+36.5", *m13.RA, *m13.Dec)
	}

	x := findObject(led.Objects, "mybackyardfield")
	if x == nil {
		t.Fatalf("unknown target object not found")
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

	if led.Summary.ObjectCount != 1 {
		t.Fatalf("ObjectCount = %d, want 1 (calibration must not create objects)", led.Summary.ObjectCount)
	}
	m31 := findObject(led.Objects, "m31")
	if m31 == nil {
		t.Fatal("expected object m31")
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
	// Equipment registry should hold one camera + one optic, both cross-linked.
	if len(led.Equipment) != 2 {
		t.Fatalf("equipment count = %d, want 2 (camera + optic)", len(led.Equipment))
	}
	for _, e := range led.Equipment {
		if len(e.ObjectIds) != 1 || e.ObjectIds[0] != "m31" {
			t.Errorf("equipment %q objectIds = %v, want [m31]", e.ID, e.ObjectIds)
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

	m31 := findObject(led.Objects, "m31")
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

	m31 := findObject(led.Objects, "m31")
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
	m31 := findObject(led.Objects, "m31")
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
	scoped := Assemble(lights, nil, model.ToolInfo{}, "/folderA")
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
	all := Assemble(lights, nil, model.ToolInfo{}, "")
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

	if got := OutsideRootDuplicateSets(lights, "/folderA"); got != 1 {
		t.Errorf("scoped to folderA hides the folderC set; got %d, want 1", got)
	}
	if got := OutsideRootDuplicateSets(lights, "/folderC"); got != 1 {
		t.Errorf("scoped to folderC hides the A/B set; got %d, want 1", got)
	}
	if got := OutsideRootDuplicateSets(lights, ""); got != 0 {
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
		t.Errorf("ledger.Skipped len = %d, want 2 (stripping happens at write time)", len(led.Skipped))
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

func TestUndatedFrameStillCounts(t *testing.T) {
	frames := []scan.Frame{
		frame("/a/u1.fits", "M42", "OSC", "Light", "ZWO ASI2600MC", 120, 2000, time.Time{}),
	}
	led := Build(frames, nil, model.ToolInfo{})
	m42 := findObject(led.Objects, "m42")
	if m42 == nil {
		t.Fatal("undated light frame must still produce its object")
	}
	if m42.TotalIntegrationSeconds != 120 {
		t.Errorf("undated integration = %v, want 120", m42.TotalIntegrationSeconds)
	}
	if len(m42.Sessions) != 1 || m42.Sessions[0].Date != "" {
		t.Errorf("undated frame should land in an empty-date session, got %+v", m42.Sessions)
	}
	if m42.NightCount != 0 {
		t.Errorf("undated-only object nightCount = %d, want 0 (undated isn't a night)", m42.NightCount)
	}
}
