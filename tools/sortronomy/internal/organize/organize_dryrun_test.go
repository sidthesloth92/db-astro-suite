package organize

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
)

// quietLogger discards all log output for tests that don't assert on it.
func quietLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// TestExecuteDryRunCreatesFoldersOnly verifies the core promise of dry run: the
// destination directory tree appears on disk, but not one file is copied.
func TestExecuteDryRunCreatesFoldersOnly(t *testing.T) {
	out := t.TempDir()
	plan := Plan{
		OutputDir: out,
		Entries: []Entry{
			{Src: "/raw/a.fit", Dst: filepath.Join(out, "2600MM", "NGC 281W", "Light", "2025-07-21 - OIII", "a.fit")},
			{Src: "/raw/b.fit", Dst: filepath.Join(out, "2600MM", "NGC 281W", "Light", "2025-07-22 - SII", "b.fit")},
			// Two files share one destination folder — it must be created once.
			{Src: "/raw/c.fit", Dst: filepath.Join(out, "2600MM", "NGC 281W", "Light", "2025-07-22 - SII", "c.fit")},
		},
	}

	if err := ExecuteDryRun(plan, Options{OutputDir: out}, quietLogger()); err != nil {
		t.Fatalf("ExecuteDryRun: %v", err)
	}

	for _, e := range plan.Entries {
		dir := filepath.Dir(e.Dst)
		info, err := os.Stat(dir)
		if err != nil {
			t.Fatalf("expected folder %q to exist: %v", dir, err)
		}
		if !info.IsDir() {
			t.Fatalf("expected %q to be a directory", dir)
		}
		// The file itself must NOT have been written.
		if _, err := os.Stat(e.Dst); !os.IsNotExist(err) {
			t.Fatalf("dry run wrote a file at %q (err=%v); it must copy nothing", e.Dst, err)
		}
	}
}

// TestExecuteDryRunIsIdempotent verifies re-running over folders that already
// exist succeeds without error, matching the tool's idempotency guarantee.
func TestExecuteDryRunIsIdempotent(t *testing.T) {
	out := t.TempDir()
	plan := Plan{
		OutputDir: out,
		Entries: []Entry{
			{Src: "/raw/a.fit", Dst: filepath.Join(out, "cam", "target", "Light", "2025-07-21", "a.fit")},
		},
	}

	if err := ExecuteDryRun(plan, Options{OutputDir: out}, quietLogger()); err != nil {
		t.Fatalf("first ExecuteDryRun: %v", err)
	}
	if err := ExecuteDryRun(plan, Options{OutputDir: out}, quietLogger()); err != nil {
		t.Fatalf("second ExecuteDryRun (should be idempotent): %v", err)
	}
}

// TestExecuteDryRunEmptyPlanDoesNothing verifies an empty plan is a no-op and
// creates no directories.
func TestExecuteDryRunEmptyPlanDoesNothing(t *testing.T) {
	out := t.TempDir()

	if err := ExecuteDryRun(Plan{OutputDir: out}, Options{OutputDir: out}, quietLogger()); err != nil {
		t.Fatalf("ExecuteDryRun on empty plan: %v", err)
	}

	entries, err := os.ReadDir(out)
	if err != nil {
		t.Fatalf("read output dir: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("empty plan created %d entries under output; want 0", len(entries))
	}
}
