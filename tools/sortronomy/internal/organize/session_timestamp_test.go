package organize

import (
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fits"
)

func TestSessionTimestamp(t *testing.T) {
	mustParse := func(s string) time.Time {
		ts, err := time.Parse("2006-01-02T15:04:05", s)
		if err != nil {
			t.Fatalf("bad timestamp %q: %v", s, err)
		}
		return ts
	}

	// The reported bug: local 21:00 on 2026-07-01, whose UTC DATE-OBS is already
	// 2026-07-02. The filename's local time must win under session grouping.
	asiairName := "/raw/Flat_3.4s_Bin1_2600MM_OIII_gain100_20260701-210029_272deg_-6.5C_0010.fit"
	plainName := "/raw/M42_stack_final.fit"
	dateOnlyName := "/raw/M42_Ha_2026-07-01_0001.fit"
	bogusName := "/raw/frame_20200101-120000_0001.fit" // years away from DATE-OBS

	tests := []struct {
		name       string
		src        string
		meta       fits.Metadata
		opts       Options
		wantSource dateSource
		wantTime   time.Time
	}{
		{
			name:       "session grouping prefers the local filename time over UTC DATE-OBS",
			src:        asiairName,
			meta:       fits.Metadata{DateObs: mustParse("2026-07-02T02:00:22")},
			opts:       Options{GroupSession: true},
			wantSource: sourceFilename,
			wantTime:   mustParse("2026-07-01T21:00:29"),
		},
		{
			name:       "session grouping falls back to DATE-LOC when the filename has no time",
			src:        plainName,
			meta:       fits.Metadata{DateObs: mustParse("2026-07-02T02:00:22"), DateLoc: mustParse("2026-07-01T21:00:22")},
			opts:       Options{GroupSession: true},
			wantSource: sourceDateLoc,
			wantTime:   mustParse("2026-07-01T21:00:22"),
		},
		{
			name:       "session grouping falls back to DATE-OBS when nothing local is available",
			src:        plainName,
			meta:       fits.Metadata{DateObs: mustParse("2026-07-02T02:00:22")},
			opts:       Options{GroupSession: true},
			wantSource: sourceDateObs,
			wantTime:   mustParse("2026-07-02T02:00:22"),
		},
		{
			name:       "no session grouping always uses DATE-OBS even with a filename time",
			src:        asiairName,
			meta:       fits.Metadata{DateObs: mustParse("2026-07-02T02:00:22")},
			opts:       Options{GroupSession: false},
			wantSource: sourceDateObs,
			wantTime:   mustParse("2026-07-02T02:00:22"),
		},
		{
			name:       "an implausible filename date is rejected in favor of the header",
			src:        bogusName,
			meta:       fits.Metadata{DateObs: mustParse("2026-07-02T02:00:22")},
			opts:       Options{GroupSession: true},
			wantSource: sourceDateObs,
			wantTime:   mustParse("2026-07-02T02:00:22"),
		},
		{
			name:       "a date-only filename token is trusted even when far from DATE-OBS",
			src:        dateOnlyName,
			meta:       fits.Metadata{DateObs: mustParse("2026-07-02T05:00:00")},
			opts:       Options{GroupSession: true},
			wantSource: sourceFilename,
			wantTime:   mustParse("2026-07-01T00:00:00"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, src := sessionTimestamp(tc.src, tc.meta, tc.opts)
			if src != tc.wantSource {
				t.Errorf("source = %d, want %d", src, tc.wantSource)
			}
			if !got.Equal(tc.wantTime) {
				t.Errorf("time = %s, want %s", got.Format(time.RFC3339), tc.wantTime.Format(time.RFC3339))
			}
		})
	}
}
