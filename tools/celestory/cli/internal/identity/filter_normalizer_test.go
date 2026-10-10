package identity

import "testing"

func TestNormalizeFilter(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"Ha", "Hα"},
		{"H-alpha", "Hα"},
		{"halpha", "Hα"},
		{"Hα", "Hα"},
		{"7nm Ha", "Hα"},
		{"Ha 3nm", "Hα"},
		{"OIII", "OIII"},
		{"O3", "OIII"},
		{"SII", "SII"},
		{"S2", "SII"},
		{"L", "L"},
		{"Luminance", "L"},
		{"Red", "R"},
		{"green", "G"},
		{"RGB", "RGB"},
		{"UHC", "UHC"},
		{"L-eXtreme", "L-eXtreme"},
		{"  ", ""},
	}
	for _, tc := range tests {
		if got := NormalizeFilter(tc.in); got != tc.want {
			t.Errorf("NormalizeFilter(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
