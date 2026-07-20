package capturetime

import (
	"testing"
	"time"
)

func TestSessionDate(t *testing.T) {
	mustParse := func(s string) time.Time {
		ts, err := time.Parse("2006-01-02T15:04:05", s)
		if err != nil {
			t.Fatalf("bad test timestamp %q: %v", s, err)
		}
		return ts
	}

	tests := []struct {
		name         string
		ts           time.Time
		groupSession bool
		rolloverHour int
		want         string
	}{
		{
			name: "zero time returns empty",
			ts:   time.Time{},
			want: "",
		},
		{
			name:         "no grouping uses literal capture day even in the evening",
			ts:           mustParse("2025-07-21T20:00:00"),
			groupSession: false,
			rolloverHour: 18,
			want:         "2025-07-21",
		},
		{
			name:         "no grouping uses literal capture day after midnight",
			ts:           mustParse("2025-07-22T02:00:00"),
			groupSession: false,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			name:         "grouping rolls a capture at the cutoff into the next day",
			ts:           mustParse("2025-07-21T18:00:00"),
			groupSession: true,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			name:         "grouping rolls an evening capture into the next day",
			ts:           mustParse("2025-07-21T20:00:00"),
			groupSession: true,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			name:         "grouping leaves a pre-cutoff morning capture on its day",
			ts:           mustParse("2025-07-22T02:00:00"),
			groupSession: true,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			// The reported bug, at the pure-function level: a local 21:00 capture
			// with a 23:00 cutoff must stay on its own day (was landing next day
			// because the UTC DATE-OBS date was already the following day).
			name:         "local evening capture below a late cutoff stays on its day",
			ts:           mustParse("2026-07-01T21:00:00"),
			groupSession: true,
			rolloverHour: 23,
			want:         "2026-07-01",
		},
		{
			name:         "local capture at a late cutoff rolls into the next day",
			ts:           mustParse("2026-07-01T23:30:00"),
			groupSession: true,
			rolloverHour: 23,
			want:         "2026-07-02",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := SessionDate(tc.ts, tc.groupSession, tc.rolloverHour)
			if got != tc.want {
				t.Errorf("SessionDate(%s, %v, %d) = %q, want %q",
					tc.ts.Format("2006-01-02T15:04:05"), tc.groupSession, tc.rolloverHour, got, tc.want)
			}
		})
	}
}

func TestAdjustDate(t *testing.T) {
	ts := time.Date(2026, 7, 1, 22, 0, 0, 0, time.UTC)
	if got := AdjustDate(ts, 23); got != "2026-07-01" {
		t.Errorf("AdjustDate below cutoff = %q, want 2026-07-01", got)
	}
	if got := AdjustDate(ts, 22); got != "2026-07-02" {
		t.Errorf("AdjustDate at cutoff = %q, want 2026-07-02", got)
	}
	if got := AdjustDate(time.Time{}, 18); got != "" {
		t.Errorf("AdjustDate zero = %q, want empty", got)
	}
}
