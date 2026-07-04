package wizard

import (
	"errors"
	"fmt"
	"testing"

	"github.com/charmbracelet/huh"
)

// TestIsCancelled verifies only a user-aborted form (bare or wrapped) counts
// as a cancel — usage and runtime errors must keep their own handling.
func TestIsCancelled(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{"bare user abort", huh.ErrUserAborted, true},
		{"wrapped user abort", fmt.Errorf("form: %w", huh.ErrUserAborted), true},
		{"nil error", nil, false},
		{"usage error", &UsageError{Msg: "input directory"}, false},
		{"generic error", errors.New("copy failed"), false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := IsCancelled(tc.err); got != tc.want {
				t.Errorf("IsCancelled(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}
