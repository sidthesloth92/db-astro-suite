package capturetime

import (
	"testing"
	"time"
)

func mustParsePick(t *testing.T, s string) time.Time {
	t.Helper()
	ts, err := time.Parse("2006-01-02T15:04:05", s)
	if err != nil {
		t.Fatalf("bad timestamp %q: %v", s, err)
	}
	return ts
}

func TestPickSessionTime(t *testing.T) {
	tests := []struct {
		name       string
		filename   string
		dateLoc    string // "" = zero
		dateObs    string // "" = zero
		wantSource Source
		wantTime   string
	}{
		{
			name:       "filename local time wins over UTC DATE-OBS",
			filename:   "/raw/Flat_3.4s_Bin1_2600MM_OIII_gain100_20260701-210029_272deg_-6.5C_0010.fit",
			dateObs:    "2026-07-02T02:00:22",
			wantSource: SourceFilename,
			wantTime:   "2026-07-01T21:00:29",
		},
		{
			name:       "no filename token falls back to DATE-LOC",
			filename:   "/raw/M42_stack_final.fit",
			dateLoc:    "2026-07-01T21:00:29",
			dateObs:    "2026-07-02T02:00:22",
			wantSource: SourceDateLoc,
			wantTime:   "2026-07-01T21:00:29",
		},
		{
			name:       "no filename token and no DATE-LOC falls back to DATE-OBS",
			filename:   "/raw/M42_stack_final.fit",
			dateObs:    "2026-07-02T02:00:22",
			wantSource: SourceDateObs,
			wantTime:   "2026-07-02T02:00:22",
		},
		{
			name:       "implausible filename time (batch rename) is rejected",
			filename:   "/raw/frame_20200101-120000_0001.fit",
			dateObs:    "2026-07-02T02:00:22",
			wantSource: SourceDateObs,
			wantTime:   "2026-07-02T02:00:22",
		},
		{
			name:       "implausible filename time still prefers DATE-LOC",
			filename:   "/raw/frame_20200101-120000_0001.fit",
			dateLoc:    "2026-07-01T21:00:29",
			dateObs:    "2026-07-02T02:00:22",
			wantSource: SourceDateLoc,
			wantTime:   "2026-07-01T21:00:29",
		},
		{
			name:       "date-only filename token is always trusted",
			filename:   "/raw/M42_Ha_2026-07-01_0001.fit",
			dateObs:    "2026-09-15T02:00:22",
			wantSource: SourceFilename,
			wantTime:   "2026-07-01T00:00:00",
		},
		{
			name:       "filename wins when DATE-OBS is missing",
			filename:   "/raw/frame_20200101-120000_0001.fit",
			wantSource: SourceFilename,
			wantTime:   "2020-01-01T12:00:00",
		},
		{
			name:       "everything missing returns the zero time as DATE-OBS",
			filename:   "/raw/M42_stack_final.fit",
			wantSource: SourceDateObs,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var dateLoc, dateObs, want time.Time
			if tc.dateLoc != "" {
				dateLoc = mustParsePick(t, tc.dateLoc)
			}
			if tc.dateObs != "" {
				dateObs = mustParsePick(t, tc.dateObs)
			}
			if tc.wantTime != "" {
				want = mustParsePick(t, tc.wantTime)
			}
			got, source := PickSessionTime(tc.filename, dateLoc, dateObs)
			if source != tc.wantSource {
				t.Errorf("source = %d, want %d", source, tc.wantSource)
			}
			if !got.Equal(want) {
				t.Errorf("time = %v, want %v", got, want)
			}
		})
	}
}

func TestDatesPlausible(t *testing.T) {
	tests := []struct {
		name         string
		filenameTime string
		dateObs      string // "" = zero
		want         bool
	}{
		{"within a UTC offset gap", "2026-07-01T21:00:29", "2026-07-02T02:00:22", true},
		{"negative gap within 24h", "2026-07-02T02:00:22", "2026-07-01T21:00:29", true},
		{"gap beyond 24h is bogus", "2020-01-01T12:00:00", "2026-07-02T02:00:22", false},
		{"zero DATE-OBS trusts the filename", "2020-01-01T12:00:00", "", true},
		{"midnight date-only token always trusted", "2026-07-01T00:00:00", "2026-09-15T02:00:22", true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var dateObs time.Time
			if tc.dateObs != "" {
				dateObs = mustParsePick(t, tc.dateObs)
			}
			if got := datesPlausible(mustParsePick(t, tc.filenameTime), dateObs); got != tc.want {
				t.Errorf("datesPlausible = %v, want %v", got, tc.want)
			}
		})
	}
}
