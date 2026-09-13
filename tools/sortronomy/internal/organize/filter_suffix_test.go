package organize

import "testing"

func TestApplyFilterSuffix(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		filter string
		want   string
	}{
		{
			name:   "appends the suffix when absent",
			input:  "Light_M31_120s_2600MM_Ha_gain100_0001.fit",
			filter: "Ha",
			want:   "Light_M31_120s_2600MM_Ha_gain100_0001_f_Ha.fit",
		},
		{
			name:   "appends the suffix on a .fits extension",
			input:  "frame_0001.fits",
			filter: "Ha",
			want:   "frame_0001_f_Ha.fits",
		},
		{
			name:   "leaves an already-correct suffix unchanged",
			input:  "Light_M31_120s_2600MM_Ha_gain100_0001_f_Ha.fit",
			filter: "Ha",
			want:   "Light_M31_120s_2600MM_Ha_gain100_0001_f_Ha.fit",
		},
		{
			name:   "replaces a different existing filter",
			input:  "Light_M31_120s_2600MM_Ha_gain100_0001_f_Ha.fit",
			filter: "OIII",
			want:   "Light_M31_120s_2600MM_Ha_gain100_0001_f_OIII.fit",
		},
		{
			name:   "does not duplicate a suffix whose filter contains an underscore",
			input:  "Light_M31_120s_2600MM_gain100_0001_f_SV_220.fit",
			filter: "SV_220",
			want:   "Light_M31_120s_2600MM_gain100_0001_f_SV_220.fit",
		},
		{
			name:   "handles a name with no extension",
			input:  "frame_0001_f_Ha",
			filter: "Ha",
			want:   "frame_0001_f_Ha",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := applyFilterSuffix(tc.input, tc.filter)
			if got != tc.want {
				t.Errorf("applyFilterSuffix(%q, %q) = %q, want %q", tc.input, tc.filter, got, tc.want)
			}
		})
	}
}
