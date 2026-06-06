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

func TestBuildIntegrationAndCalibrationExclusion(t *testing.T) {
	n1 := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	n2 := time.Date(2025, 8, 2, 22, 0, 0, 0, time.UTC)
	frames := []scan.Frame{
		frame("/a/l1.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1000, n1),
		frame("/a/l2.fits", "M31", "Ha", "Light", "ZWO ASI2600MM", 300, 1001, n1),
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
