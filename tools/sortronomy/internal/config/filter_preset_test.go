package config

import (
	"reflect"
	"testing"
)

func samplePresets() []FilterPreset {
	return []FilterPreset{
		{Name: "SV220", Type: "Ha", Description: "Svbony SV220 7nm Ha"},
		{Name: "L-eXtreme", Type: "Dual", Description: "Optolong L-eXtreme"},
		{Name: "UVIR", Type: "L"},
	}
}

// snapshotPresets copies a preset slice for later mutation checks, preserving
// nilness so reflect.DeepEqual treats nil and empty inputs correctly.
func snapshotPresets(presets []FilterPreset) []FilterPreset {
	if presets == nil {
		return nil
	}
	out := make([]FilterPreset, len(presets))
	copy(out, presets)
	return out
}

func TestFindFilterPreset(t *testing.T) {
	tests := []struct {
		name     string
		presets  []FilterPreset
		lookup   string
		want     string // expected preset Name; "" means not found
		wantFind bool
	}{
		{name: "exact match", presets: samplePresets(), lookup: "SV220", want: "SV220", wantFind: true},
		{name: "case-insensitive match", presets: samplePresets(), lookup: "sv220", want: "SV220", wantFind: true},
		{name: "trimmed match", presets: samplePresets(), lookup: "  UVIR  ", want: "UVIR", wantFind: true},
		{name: "not found", presets: samplePresets(), lookup: "SII", wantFind: false},
		{name: "nil slice", presets: nil, lookup: "SV220", wantFind: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, found := FindFilterPreset(tt.presets, tt.lookup)
			if found != tt.wantFind {
				t.Fatalf("FindFilterPreset(%q) found = %v, want %v", tt.lookup, found, tt.wantFind)
			}
			if found && got.Name != tt.want {
				t.Errorf("FindFilterPreset(%q).Name = %q, want %q", tt.lookup, got.Name, tt.want)
			}
			if !found && !reflect.DeepEqual(got, FilterPreset{}) {
				t.Errorf("FindFilterPreset(%q) = %+v, want zero preset when not found", tt.lookup, got)
			}
		})
	}
}

func TestAddFilterPreset(t *testing.T) {
	added := FilterPreset{Name: "SII", Type: "SII", Description: "Antlia SII"}

	tests := []struct {
		name    string
		presets []FilterPreset
		wantLen int
	}{
		{name: "append to nil", presets: nil, wantLen: 1},
		{name: "append to existing", presets: samplePresets(), wantLen: 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			before := snapshotPresets(tt.presets)

			got := AddFilterPreset(tt.presets, added)
			if len(got) != tt.wantLen {
				t.Fatalf("AddFilterPreset returned %d presets, want %d", len(got), tt.wantLen)
			}
			if !reflect.DeepEqual(got[len(got)-1], added) {
				t.Errorf("last preset = %+v, want %+v", got[len(got)-1], added)
			}
			if !reflect.DeepEqual(tt.presets, before) {
				t.Errorf("input slice was modified: %+v, want %+v", tt.presets, before)
			}
		})
	}
}

func TestRemoveFilterPreset(t *testing.T) {
	tests := []struct {
		name      string
		presets   []FilterPreset
		remove    string
		wantNames []string
	}{
		{name: "remove first", presets: samplePresets(), remove: "SV220", wantNames: []string{"L-eXtreme", "UVIR"}},
		{name: "remove middle", presets: samplePresets(), remove: "L-eXtreme", wantNames: []string{"SV220", "UVIR"}},
		{name: "remove last", presets: samplePresets(), remove: "UVIR", wantNames: []string{"SV220", "L-eXtreme"}},
		{name: "remove case-insensitive", presets: samplePresets(), remove: "uvir", wantNames: []string{"SV220", "L-eXtreme"}},
		{name: "remove missing name", presets: samplePresets(), remove: "SII", wantNames: []string{"SV220", "L-eXtreme", "UVIR"}},
		{name: "remove from nil", presets: nil, remove: "SV220", wantNames: nil},
		{name: "remove only preset yields nil", presets: []FilterPreset{{Name: "SV220", Type: "Ha"}}, remove: "SV220", wantNames: nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			before := snapshotPresets(tt.presets)

			got := RemoveFilterPreset(tt.presets, tt.remove)
			var gotNames []string
			for _, p := range got {
				gotNames = append(gotNames, p.Name)
			}
			if !reflect.DeepEqual(gotNames, tt.wantNames) {
				t.Errorf("RemoveFilterPreset(%q) names = %v, want %v", tt.remove, gotNames, tt.wantNames)
			}
			if !reflect.DeepEqual(tt.presets, before) {
				t.Errorf("input slice was modified: %+v, want %+v", tt.presets, before)
			}
		})
	}
}
