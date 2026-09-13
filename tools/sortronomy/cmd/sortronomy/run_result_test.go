package main

import (
	"errors"
	"fmt"
	"testing"

	"github.com/charmbracelet/huh"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/wizard"
)

// TestClassifyRunErr covers the outcome mapping: exit code, run-end status,
// and whether a crash report is warranted for each class of top-level error.
func TestClassifyRunErr(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want runOutcome
	}{
		{
			name: "nil error is a clean run",
			err:  nil,
			want: runOutcome{Code: 0, Status: statusOK},
		},
		{
			name: "user-aborted form is a quiet cancel",
			err:  huh.ErrUserAborted,
			want: runOutcome{Code: 130, Status: statusCancelled},
		},
		{
			name: "wrapped user abort is still a cancel",
			err:  fmt.Errorf("form: %w", huh.ErrUserAborted),
			want: runOutcome{Code: 130, Status: statusCancelled},
		},
		{
			name: "usage error exits 2 with no report",
			err:  &wizard.UsageError{Msg: "input directory", Err: errors.New("no such file")},
			want: runOutcome{Code: 2, Status: statusUsage},
		},
		{
			name: "wrapped usage error is still usage",
			err:  fmt.Errorf("run: %w", &wizard.UsageError{Msg: "bad filter"}),
			want: runOutcome{Code: 2, Status: statusUsage},
		},
		{
			name: "any other error is a failure with a report",
			err:  errors.New("3 file(s) failed"),
			want: runOutcome{Code: 1, Status: statusError, Report: true},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := classifyRunErr(tc.err); got != tc.want {
				t.Errorf("classifyRunErr(%v) = %+v, want %+v", tc.err, got, tc.want)
			}
		})
	}
}
