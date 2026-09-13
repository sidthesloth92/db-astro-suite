package wizard

import (
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fits"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

func quietLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// TestRunNonInteractiveRequiresCompleteFilter verifies the headless path rejects
// a filter that has only its folder label or only its FITS name — both are
// required once filter mode is engaged. A valid (temp) input is used so the
// filter check is the one that fails, not input validation.
func TestRunNonInteractiveRequiresCompleteFilter(t *testing.T) {
	src := t.TempDir()

	tests := []struct {
		name string
		opts organize.Options
	}{
		{
			name: "filter on with only a folder label",
			opts: organize.Options{InputDir: src, TagFilter: true, Filter: organize.FilterTag{Type: "Ha"}},
		},
		{
			name: "filter on with only a FITS name",
			opts: organize.Options{InputDir: src, TagFilter: true, Filter: organize.FilterTag{Name: "SV220"}},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := RunNonInteractive(quietLogger(), config.Config{}, tc.opts, false)
			if err == nil {
				t.Fatal("expected a filter-completeness error, got nil")
			}
			if !strings.Contains(err.Error(), "--filter-type and --filter-name") {
				t.Errorf("unexpected error: %v", err)
			}
			// Must be a UsageError so the CLI exits 2 without a crash report.
			var ue *UsageError
			if !errors.As(err, &ue) {
				t.Errorf("want a *UsageError, got %T: %v", err, err)
			}
		})
	}
}

// TestRunNonInteractiveRejectsOversizedFilterFields verifies the headless path
// rejects filter values that cannot fit on their FITS header cards, so the tag
// can never spill onto COMMENT or CONTINUE cards at write time.
func TestRunNonInteractiveRejectsOversizedFilterFields(t *testing.T) {
	src := t.TempDir()

	tests := []struct {
		name   string
		filter organize.FilterTag
	}{
		{
			name:   "description longer than one FITS card",
			filter: organize.FilterTag{Type: "Ha", Name: "SV220", Description: strings.Repeat("d", fits.MaxFilterDescLen+1)},
		},
		{
			name:   "name too long for the FILTER card",
			filter: organize.FilterTag{Type: "Ha", Name: strings.Repeat("n", fits.MaxFilterNameLen+1)},
		},
		{
			name:   "single quote in the description",
			filter: organize.FilterTag{Type: "Ha", Name: "SV220", Description: "3nm 'gold' edition"},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			opts := organize.Options{InputDir: src, TagFilter: true, Filter: tc.filter}
			err := RunNonInteractive(quietLogger(), config.Config{}, opts, false)
			if err == nil {
				t.Fatal("expected a filter-validation error, got nil")
			}
			var ue *UsageError
			if !errors.As(err, &ue) {
				t.Errorf("want a *UsageError, got %T: %v", err, err)
			}
		})
	}
}

// TestPrintConfirmedPlanKeepsOptionsVisible verifies the confirmed option
// summary is echoed to the writer, so the choices survive in the terminal
// scrollback after the interactive review form clears itself.
func TestPrintConfirmedPlanKeepsOptionsVisible(t *testing.T) {
	var buf strings.Builder
	printConfirmedPlan(&buf, organize.Options{
		InputDir:            "/frames/in",
		OutputDir:           "/frames/out",
		GroupByDate:         true,
		GroupSession:        true,
		SessionRolloverHour: 18,
		TagFilter:           true,
		Filter:              organize.FilterTag{Type: "Ha", Name: "SV220", Description: "Svbony 7nm"},
	})
	out := buf.String()
	for _, want := range []string{"Input:", "/frames/in", "/frames/out", "rolls at 18:00", "Ha", "Svbony 7nm"} {
		if !strings.Contains(out, want) {
			t.Errorf("confirmed-plan summary missing %q in:\n%s", want, out)
		}
	}
}

// TestRunNonInteractiveRejectsMissingInput verifies the headless path errors
// when no input directory is given, rather than silently doing nothing.
func TestRunNonInteractiveRejectsMissingInput(t *testing.T) {
	err := RunNonInteractive(quietLogger(), config.Config{}, organize.Options{InputDir: ""}, false)
	if err == nil {
		t.Fatal("expected an input error for an empty input dir, got nil")
	}
	var ue *UsageError
	if !errors.As(err, &ue) {
		t.Errorf("want a *UsageError, got %T: %v", err, err)
	}
}
