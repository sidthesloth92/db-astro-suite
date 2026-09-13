package config

import "strings"

// FilterPreset is a saved filter definition the wizard offers as a reusable
// choice. Name is the FITS FILTER keyword value and doubles as the preset's
// identity in the saved-filter menu; Type is the folder label used in the
// organized tree; Description is an optional note stored in the FITS
// FILTDESC keyword.
type FilterPreset struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
}

// FindFilterPreset returns the first preset whose Name matches name
// (case-insensitive, whitespace-trimmed) and true, or a zero preset and false.
func FindFilterPreset(presets []FilterPreset, name string) (FilterPreset, bool) {
	for _, p := range presets {
		if filterPresetNameEqual(p.Name, name) {
			return p, true
		}
	}
	return FilterPreset{}, false
}

// AddFilterPreset returns a new slice with p appended. The input slice is not
// modified.
func AddFilterPreset(presets []FilterPreset, p FilterPreset) []FilterPreset {
	out := make([]FilterPreset, 0, len(presets)+1)
	out = append(out, presets...)
	return append(out, p)
}

// RemoveFilterPreset returns a new slice without the preset named name
// (case-insensitive, whitespace-trimmed). The input slice is not modified.
// Removing the last preset yields nil so the field is dropped from the saved
// JSON via omitempty.
func RemoveFilterPreset(presets []FilterPreset, name string) []FilterPreset {
	var out []FilterPreset
	for _, p := range presets {
		if filterPresetNameEqual(p.Name, name) {
			continue
		}
		out = append(out, p)
	}
	return out
}

// filterPresetNameEqual compares two preset names case-insensitively after
// trimming surrounding whitespace, so "ha " and "Ha" identify the same preset.
func filterPresetNameEqual(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}
