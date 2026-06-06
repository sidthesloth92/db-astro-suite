package fits

import "testing"

func TestSoftwareLabel(t *testing.T) {
	tests := []struct {
		name string
		meta Metadata
		want string
	}{
		{
			name: "recognized program uses its display name and ignores raw software",
			meta: Metadata{Program: ProgramNINA, Software: "N.I.N.A. 3.1"},
			want: "N.I.N.A.",
		},
		{
			name: "unrecognized program falls back to the raw creator string",
			meta: Metadata{Program: ProgramUnknown, Software: "MaxIm DL Pro 6"},
			want: "MaxIm DL Pro 6",
		},
		{
			name: "raw creator string is trimmed",
			meta: Metadata{Program: ProgramUnknown, Software: "  TheSkyX  "},
			want: "TheSkyX",
		},
		{
			name: "unrecognized with no creator string reports Unknown",
			meta: Metadata{Program: ProgramUnknown, Software: ""},
			want: "Unknown",
		},
		{
			name: "unrecognized with whitespace-only creator string reports Unknown",
			meta: Metadata{Program: ProgramUnknown, Software: "   "},
			want: "Unknown",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.meta.SoftwareLabel(); got != tc.want {
				t.Errorf("SoftwareLabel() = %q, want %q", got, tc.want)
			}
		})
	}
}
