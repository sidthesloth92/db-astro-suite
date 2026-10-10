package main

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/libs/redact"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// TestDuplicateSetRecordMasksHomePaths pins the fix for a real leak: the
// duplicate-set record used to log its paths as a []string attr, which the
// home masker does not rewrite (it only masks string and error attrs), so raw
// /Users/<name> paths reached the shareable log. The paths must go through as
// one maskable string.
func TestDuplicateSetRecordMasksHomePaths(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skipf("no home dir available: %v", err)
	}
	masker, ok := redact.SystemMasker()
	if !ok {
		t.Skip("no system masker available")
	}

	// The same handler wiring internal/logger uses for the real cache log.
	var buf strings.Builder
	log := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{ReplaceAttr: masker.ReplaceAttr}))

	story := model.Story{
		Duplicates: []model.DuplicateSet{{
			Designation: "M 31",
			DateObs:     "2025-08-02T02:00:22Z",
			SizeBytes:   1000,
			Paths: []string{
				filepath.Join(home, "Astro", "M31", "L_0001.fits"),
				filepath.Join(home, "Backup", "M31", "L_0001.fits"),
			},
		}},
	}
	logStoryAssembled(log, story, 0)

	out := buf.String()
	if strings.Contains(out, home) {
		t.Errorf("duplicate-set record leaks the home directory %q:\n%s", home, out)
	}
	sep := string(filepath.Separator)
	for _, want := range []string{"~" + sep + "Astro", "~" + sep + "Backup"} {
		if !strings.Contains(out, want) {
			t.Errorf("duplicate-set record missing masked path %q in:\n%s", want, out)
		}
	}
}
