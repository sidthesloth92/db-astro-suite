package wizard

import (
	"testing"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

func TestPresetOptionLabel(t *testing.T) {
	tests := []struct {
		name   string
		preset config.FilterPreset
		want   string
	}{
		{
			name:   "with description",
			preset: config.FilterPreset{Name: "SV220", Type: "Ha", Description: "Svbony SV220 7nm Ha"},
			want:   "SV220 — Ha (Svbony SV220 7nm Ha)",
		},
		{
			name:   "without description",
			preset: config.FilterPreset{Name: "UVIR", Type: "L"},
			want:   "UVIR — L",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := presetOptionLabel(tt.preset); got != tt.want {
				t.Errorf("presetOptionLabel = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestPresetSelectOptions(t *testing.T) {
	tests := []struct {
		name    string
		presets []config.FilterPreset
		wantLen int
	}{
		{name: "empty list is Back-only", presets: nil, wantLen: 1},
		{
			name: "presets then Back",
			presets: []config.FilterPreset{
				{Name: "SV220", Type: "Ha"},
				{Name: "UVIR", Type: "L"},
			},
			wantLen: 3,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := presetSelectOptions(tt.presets)
			if len(got) != tt.wantLen {
				t.Fatalf("got %d options, want %d", len(got), tt.wantLen)
			}
			for i := range tt.presets {
				if got[i].Value != i {
					t.Errorf("option %d value = %d, want the slice index %d", i, got[i].Value, i)
				}
			}
			last := got[len(got)-1]
			if last.Value != presetChoiceBack {
				t.Errorf("last option value = %d, want presetChoiceBack (%d)", last.Value, presetChoiceBack)
			}
		})
	}
}

func TestDefaultPresetChoice(t *testing.T) {
	tests := []struct {
		name    string
		presets []config.FilterPreset
		want    int
	}{
		{name: "empty list defaults to Back", presets: nil, want: presetChoiceBack},
		{name: "non-empty list defaults to first preset", presets: []config.FilterPreset{{Name: "SV220"}}, want: 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := defaultPresetChoice(tt.presets); got != tt.want {
				t.Errorf("defaultPresetChoice = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestFilterNameValidator(t *testing.T) {
	saved := []config.FilterPreset{{Name: "SV220", Type: "Ha"}}

	tests := []struct {
		name    string
		presets []config.FilterPreset
		input   string
		wantErr bool
	}{
		{name: "empty rejected", presets: saved, input: "", wantErr: true},
		{name: "whitespace rejected", presets: saved, input: "   ", wantErr: true},
		{name: "duplicate rejected", presets: saved, input: "SV220", wantErr: true},
		{name: "case-insensitive duplicate rejected", presets: saved, input: "sv220", wantErr: true},
		{name: "unique accepted", presets: saved, input: "L-eXtreme", wantErr: false},
		{name: "unique against empty list accepted", presets: nil, input: "SV220", wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := filterNameValidator(tt.presets)(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("filterNameValidator(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}

func TestFilterTagFromPreset(t *testing.T) {
	preset := config.FilterPreset{Name: "SV220", Type: "Ha", Description: "Svbony SV220 7nm Ha"}
	want := organize.FilterTag{Name: "SV220", Type: "Ha", Description: "Svbony SV220 7nm Ha"}
	if got := filterTagFromPreset(preset); got != want {
		t.Errorf("filterTagFromPreset = %+v, want %+v", got, want)
	}
}

func TestFilterSuppliedByFlags(t *testing.T) {
	tests := []struct {
		name   string
		filter organize.FilterTag
		want   bool
	}{
		{name: "type and name", filter: organize.FilterTag{Type: "Ha", Name: "SV220"}, want: true},
		{name: "only type", filter: organize.FilterTag{Type: "Ha"}, want: false},
		{name: "only name", filter: organize.FilterTag{Name: "SV220"}, want: false},
		{name: "whitespace values", filter: organize.FilterTag{Type: "  ", Name: "  "}, want: false},
		{name: "empty", filter: organize.FilterTag{}, want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := organize.Options{Filter: tt.filter}
			if got := filterSuppliedByFlags(opts); got != tt.want {
				t.Errorf("filterSuppliedByFlags(%+v) = %v, want %v", tt.filter, got, tt.want)
			}
		})
	}
}
