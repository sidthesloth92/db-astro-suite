package organize

import (
	"bytes"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestBuildPlanLogsSkippedFileNames verifies the debug log captures the name of
// a file that can't be organized, which is the whole point of the log: a user
// can send it back and we can see exactly which file failed and why.
func TestBuildPlanLogsSkippedFileNames(t *testing.T) {
	srcDir := t.TempDir()
	badName := "broken.fit"
	if err := os.WriteFile(filepath.Join(srcDir, badName), []byte("not a real FITS file"), 0o644); err != nil {
		t.Fatalf("seed bad file: %v", err)
	}

	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug}))

	plan, err := BuildPlan(Options{SourceDir: srcDir, OutputDir: t.TempDir()}, log)
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}

	if len(plan.Skips) != 1 {
		t.Fatalf("want 1 skip, got %d", len(plan.Skips))
	}

	out := buf.String()
	if !strings.Contains(out, badName) {
		t.Errorf("log does not mention the skipped file %q:\n%s", badName, out)
	}
	if !strings.Contains(out, "skipped") {
		t.Errorf("log does not record a skip:\n%s", out)
	}
}

// TestBuildPlanCleanRunDoesNotLogSkips verifies an empty source produces no
// skip records — the log stays quiet when there's nothing wrong.
func TestBuildPlanCleanRunDoesNotLogSkips(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, nil))

	plan, err := BuildPlan(Options{SourceDir: t.TempDir(), OutputDir: t.TempDir()}, log)
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Skips) != 0 {
		t.Fatalf("want 0 skips, got %d", len(plan.Skips))
	}
	if strings.Contains(buf.String(), "skipped") {
		t.Errorf("clean run should not log skips:\n%s", buf.String())
	}
}
