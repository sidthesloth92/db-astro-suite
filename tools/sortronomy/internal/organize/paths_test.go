package organize

import (
	"testing"
	"time"
)

func TestSessionDate(t *testing.T) {
	mustParse := func(s string) time.Time {
		ts, err := time.Parse(time.RFC3339, s)
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
			ts:           mustParse("2025-07-21T20:00:00Z"),
			groupSession: false,
			rolloverHour: 18,
			want:         "2025-07-21",
		},
		{
			name:         "no grouping uses literal capture day after midnight",
			ts:           mustParse("2025-07-22T02:00:00Z"),
			groupSession: false,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			name:         "grouping rolls a capture at the cutoff into the next day",
			ts:           mustParse("2025-07-21T18:00:00Z"),
			groupSession: true,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			name:         "grouping rolls an evening capture into the next day",
			ts:           mustParse("2025-07-21T20:00:00Z"),
			groupSession: true,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
		{
			name:         "grouping leaves a pre-cutoff morning capture on its day",
			ts:           mustParse("2025-07-22T02:00:00Z"),
			groupSession: true,
			rolloverHour: 18,
			want:         "2025-07-22",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := SessionDate(tc.ts, tc.groupSession, tc.rolloverHour)
			if got != tc.want {
				t.Errorf("SessionDate(%s, %v, %d) = %q, want %q",
					tc.ts.Format(time.RFC3339), tc.groupSession, tc.rolloverHour, got, tc.want)
			}
		})
	}
}
