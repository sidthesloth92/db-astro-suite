package capturetime

import (
	"testing"
	"time"
)

func TestParseFilenameTimestamp(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		wantOK bool
		want   string // "2006-01-02T15:04:05" local wall clock; ignored when !wantOK
	}{
		{
			name:   "asiair light frame",
			input:  "Light_M31_120.0s_Bin1_2600MM_Ha_gain100_20260701-210029_-10.0C_0001.fit",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "asiair flat frame with rotation and temp tokens",
			input:  "Flat_3.4s_Bin1_2600MM_OIII_gain100_20260701-210029_272deg_-6.5C_0010.fit",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "nina default datetime",
			input:  "M42_Light_Ha_2026-07-01_21-00-29.fits",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "nina iso T variant",
			input:  "M42_Light_2026-07-01T21-00-29.fits",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "sharpcap spaced",
			input:  "Capture 2026-07-01 21_00_29.fits",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "sharpcap fully underscored",
			input:  "Capture_2026-07-01_21_00_29.fits",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "compact iso",
			input:  "frame_20260701T210029_0001.fit",
			wantOK: true,
			want:   "2026-07-01T21:00:29",
		},
		{
			name:   "nina dateminus12 date only",
			input:  "M42_Ha_2026-07-01_0042.fits",
			wantOK: true,
			want:   "2026-07-01T00:00:00",
		},
		{
			name:   "no timestamp at all",
			input:  "M42_stack_final.fits",
			wantOK: false,
		},
		{
			name:   "digits present but not a date",
			input:  "Light_2600MM_gain100_0001.fit",
			wantOK: false,
		},
		{
			name:   "impossible date is rejected",
			input:  "frame_2026-13-40_0001.fit",
			wantOK: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := ParseFilenameTimestamp(tc.input)
			if ok != tc.wantOK {
				t.Fatalf("ParseFilenameTimestamp(%q) ok = %v, want %v", tc.input, ok, tc.wantOK)
			}
			if !tc.wantOK {
				return
			}
			want, err := time.Parse("2006-01-02T15:04:05", tc.want)
			if err != nil {
				t.Fatalf("bad want %q: %v", tc.want, err)
			}
			if !got.Equal(want) {
				t.Errorf("ParseFilenameTimestamp(%q) = %s, want %s",
					tc.input, got.Format(time.RFC3339), want.Format(time.RFC3339))
			}
		})
	}
}

func TestParseFitsDateTime(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		wantOK bool
		want   time.Time
	}{
		{"iso seconds", "2026-07-02T02:00:22", true, time.Date(2026, 7, 2, 2, 0, 22, 0, time.UTC)},
		{"iso microseconds", "2026-07-02T02:00:22.879985", true, time.Date(2026, 7, 2, 2, 0, 22, 879985000, time.UTC)},
		{"iso milliseconds", "2026-07-02T02:00:22.880", true, time.Date(2026, 7, 2, 2, 0, 22, 880000000, time.UTC)},
		{"date only", "2026-07-02", true, time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)},
		{"surrounding whitespace", "  2026-07-02T02:00:22  ", true, time.Date(2026, 7, 2, 2, 0, 22, 0, time.UTC)},
		{"empty", "", false, time.Time{}},
		{"unrecognized", "not-a-date", false, time.Time{}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := ParseFitsDateTime(tc.input)
			if ok != tc.wantOK {
				t.Fatalf("ParseFitsDateTime(%q) ok = %v, want %v", tc.input, ok, tc.wantOK)
			}
			if !tc.wantOK {
				return
			}
			if !got.Equal(tc.want) {
				t.Errorf("ParseFitsDateTime(%q) = %s, want %s",
					tc.input, got.Format(time.RFC3339Nano), tc.want.Format(time.RFC3339Nano))
			}
		})
	}
}
