package equipment

import (
	"testing"
	"time"
)

func TestBuildRegistryMountSeparatedFromTelescope(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	// TELESCOP carries the mount name (EQMOD/ASCOM setup); FOCALLEN is the real
	// telescope spec.
	usages := []Usage{
		{TargetID: "m31", CameraRaw: "ZWO ASI2600MM", Telescope: "EQMod Mount", Focal: 700, FRatio: 4.9, ExposureSeconds: 300, Date: d},
		{TargetID: "m31", CameraRaw: "ZWO ASI2600MM", Telescope: "EQMod Mount", Focal: 700, FRatio: 4.9, ExposureSeconds: 300, Date: d},
	}

	items := BuildRegistry(usages)

	kinds := map[string]int{}
	for _, e := range items {
		kinds[e.Kind]++
	}
	if kinds["camera"] != 1 {
		t.Errorf("camera count = %d, want 1", kinds["camera"])
	}
	if kinds["mount"] != 1 {
		t.Errorf("mount count = %d, want 1", kinds["mount"])
	}
	if kinds["telescope"] != 0 {
		t.Errorf("telescope count = %d, want 0 (no unnamed telescope for a mount)", kinds["telescope"])
	}

	for _, e := range items {
		if e.Kind != "mount" {
			continue
		}
		if e.DisplayName != "EQMod Mount" {
			t.Errorf("mount displayName = %q, want 'EQMod Mount'", e.DisplayName)
		}
		if e.FocalLengthMm != nil || e.FRatio != nil {
			t.Errorf("mount must not carry focal/f-ratio, got focal=%v fratio=%v", e.FocalLengthMm, e.FRatio)
		}
		if e.LightFrameCount != 2 {
			t.Errorf("mount lightFrameCount = %d, want 2", e.LightFrameCount)
		}
	}
}

func TestBuildRegistryRealScopeStaysTelescope(t *testing.T) {
	d := time.Date(2025, 8, 1, 22, 0, 0, 0, time.UTC)
	usages := []Usage{
		{TargetID: "m31", CameraRaw: "ZWO ASI2600MM", Telescope: "William Optics RedCat 51", Focal: 250, FRatio: 4.9, ExposureSeconds: 300, Date: d},
	}

	items := BuildRegistry(usages)

	var scopeName string
	var scopeFocal *float64
	for _, e := range items {
		if e.Kind == "mount" {
			t.Errorf("real scope must not produce a mount: %+v", e)
		}
		if e.Kind == "telescope" {
			scopeName = e.DisplayName
			scopeFocal = e.FocalLengthMm
		}
	}
	if scopeName != "William Optics RedCat 51" {
		t.Errorf("telescope displayName = %q, want 'William Optics RedCat 51'", scopeName)
	}
	if scopeFocal == nil || *scopeFocal != 250 {
		t.Errorf("telescope focal = %v, want 250", scopeFocal)
	}
}
