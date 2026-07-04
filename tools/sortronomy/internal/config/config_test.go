package config

import (
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"
)

// setTestConfigDir points os.UserConfigDir at a per-test temp directory so
// Save/Load never touch the real user config.
func setTestConfigDir(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	switch runtime.GOOS {
	case "windows":
		t.Setenv("AppData", dir)
	case "darwin", "linux":
		t.Setenv("HOME", dir)
		t.Setenv("XDG_CONFIG_HOME", "")
	default:
		t.Skipf("no config-dir override seam on %s", runtime.GOOS)
	}
}

// writeTestConfigFile writes raw bytes at the resolved config path, creating
// the parent directory — used to simulate on-disk states Load must tolerate.
func writeTestConfigFile(t *testing.T, data []byte) {
	t.Helper()
	path, err := configPath()
	if err != nil {
		t.Fatalf("configPath: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
}

func TestSaveLoadRoundTrip(t *testing.T) {
	setTestConfigDir(t)

	want := Config{
		Organize: OrganizeSettings{
			InputDir:            "/in",
			OutputDir:           "/out",
			SessionRolloverHour: 18,
			GroupByFocal:        true,
			GroupByDate:         true,
			GroupByFilter:       true,
			GroupSession:        true,
		},
		Flats: FlatsPaths{InputDir: "/flats/in", OutputDir: "/flats/out"},
		FilterPresets: []FilterPreset{
			{Name: "SV220", Type: "Ha", Description: "Svbony SV220 7nm Ha"},
			{Name: "UVIR", Type: "L"},
		},
	}

	if err := Save(want); err != nil {
		t.Fatalf("Save: %v", err)
	}
	got, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("round trip mismatch:\ngot  %+v\nwant %+v", got, want)
	}
}

func TestLoadMissingFileReturnsZeroConfig(t *testing.T) {
	setTestConfigDir(t)

	got, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !reflect.DeepEqual(got, Config{}) {
		t.Errorf("Load with no file = %+v, want zero Config", got)
	}
}

func TestLoadCorruptFileReturnsZeroConfig(t *testing.T) {
	setTestConfigDir(t)
	writeTestConfigFile(t, []byte("{not json"))

	got, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !reflect.DeepEqual(got, Config{}) {
		t.Errorf("Load with corrupt file = %+v, want zero Config", got)
	}
}

func TestLoadConfigWithoutPresets(t *testing.T) {
	setTestConfigDir(t)
	// A config written by a version that predates filter presets.
	writeTestConfigFile(t, []byte(`{
  "organize": {"inputDir": "/in", "outputDir": "/out", "groupByDate": true},
  "flats": {"inputDir": "/flats/in"}
}`))

	got, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.Organize.InputDir != "/in" || got.Organize.OutputDir != "/out" || !got.Organize.GroupByDate {
		t.Errorf("Organize settings not loaded: %+v", got.Organize)
	}
	if got.Flats.InputDir != "/flats/in" {
		t.Errorf("Flats settings not loaded: %+v", got.Flats)
	}
	if got.FilterPresets != nil {
		t.Errorf("FilterPresets = %+v, want nil for legacy config", got.FilterPresets)
	}
}

func TestSaveOmitsEmptyPresets(t *testing.T) {
	setTestConfigDir(t)

	if err := Save(Config{Organize: OrganizeSettings{InputDir: "/in"}}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	path, err := configPath()
	if err != nil {
		t.Fatalf("configPath: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if strings.Contains(string(data), "filterPresets") {
		t.Errorf("saved JSON contains \"filterPresets\" for a preset-less config:\n%s", data)
	}
}
