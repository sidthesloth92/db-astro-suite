package organize

import (
	"reflect"
	"testing"
)

func TestSoftwareLabels(t *testing.T) {
	tests := []struct {
		name string
		seen map[string]int
		want []string
	}{
		{
			name: "empty tally yields no entries",
			seen: map[string]int{},
			want: []string{},
		},
		{
			name: "sorted by count descending",
			seen: map[string]int{"ASIAIR": 10, "N.I.N.A.": 50, "MaxIm DL": 5},
			want: []string{"N.I.N.A. (50)", "ASIAIR (10)", "MaxIm DL (5)"},
		},
		{
			name: "equal counts tie-break by label ascending",
			seen: map[string]int{"Voyager": 3, "ASIAIR": 3, "Unknown": 3},
			want: []string{"ASIAIR (3)", "Unknown (3)", "Voyager (3)"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := softwareLabels(tc.seen)
			if len(got) == 0 && len(tc.want) == 0 {
				return
			}
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("softwareLabels() = %v, want %v", got, tc.want)
			}
		})
	}
}
