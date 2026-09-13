package organize

import (
	"bytes"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/astrogo/fitsio"
)

// writeFITSFixture creates a minimal dataless FITS file at path whose primary
// header carries enough capture cards for BuildPlan to plan a destination.
// Mirrors the fixture helper in internal/fits (test helpers are package-local).
func writeFITSFixture(t *testing.T, path string) {
	t.Helper()
	cards := []fitsio.Card{
		{Name: "IMAGETYP", Value: "Light", Comment: "Type of image"},
		{Name: "INSTRUME", Value: "ZWO ASI533MC Pro", Comment: "Camera model"},
		{Name: "OBJECT", Value: "M31", Comment: "Target"},
		{Name: "DATE-OBS", Value: "2026-06-28T04:34:29.378751", Comment: "Exposure start"},
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("create fixture: %v", err)
	}
	defer f.Close()
	w, err := fitsio.Create(f)
	if err != nil {
		t.Fatalf("create fits: %v", err)
	}
	hdu, err := fitsio.NewPrimaryHDU(fitsio.NewHeader(cards, fitsio.IMAGE_HDU, 8, nil))
	if err != nil {
		t.Fatalf("new primary hdu: %v", err)
	}
	if err := w.Write(hdu); err != nil {
		t.Fatalf("write hdu: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("close fits: %v", err)
	}
}

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

	plan, err := BuildPlan(Options{InputDir: srcDir, OutputDir: t.TempDir()}, log)
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

// TestBuildPlanCleanRunDoesNotLogSkips verifies an empty input produces no
// skip records — the log stays quiet when there's nothing wrong.
func TestBuildPlanCleanRunDoesNotLogSkips(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, nil))

	plan, err := BuildPlan(Options{InputDir: t.TempDir(), OutputDir: t.TempDir()}, log)
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Skips) != 0 {
		t.Fatalf("want 0 skips, got %d", len(plan.Skips))
	}
	// The scan summary's skipped=0 counter is expected; what must not appear
	// is a per-file skip record (msg "skipped: <reason>").
	if strings.Contains(buf.String(), "skipped:") {
		t.Errorf("clean run should not log skip records:\n%s", buf.String())
	}
}

// TestBuildPlanLogsPlannedDecisionsAtInfo verifies a normal (non --debug) run
// records each file's src → dst decision with the metadata that drove it, plus
// the run settings and scan summary — the detail that makes an "output looks
// wrong but nothing failed" report debuggable from the log alone.
func TestBuildPlanLogsPlannedDecisionsAtInfo(t *testing.T) {
	srcDir := t.TempDir()
	writeFITSFixture(t, filepath.Join(srcDir, "Light_M31_120s.fit"))

	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	plan, err := BuildPlan(Options{InputDir: srcDir, OutputDir: t.TempDir()}, log)
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Entries) != 1 {
		t.Fatalf("want 1 planned entry, got %d (skips: %+v)", len(plan.Entries), plan.Skips)
	}

	out := buf.String()
	for _, want := range []string{
		"scan start",
		"msg=planned",
		"Light_M31_120s.fit",
		"dst=",
		"dateSource=DATE-OBS",
		"target=M31",
		"scan complete",
		"found=1",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("INFO log missing %q:\n%s", want, out)
		}
	}
}

// TestExecutePlanLogsAlreadyExistingDestinations verifies a re-run over an
// existing destination records why the file was not rewritten — the most
// common "why didn't it copy my file?" confusion.
func TestExecutePlanLogsAlreadyExistingDestinations(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()
	src := filepath.Join(srcDir, "frame.fit")
	dst := filepath.Join(dstDir, "frame.fit")
	if err := os.WriteFile(src, []byte("data"), 0o644); err != nil {
		t.Fatalf("seed src: %v", err)
	}
	if err := os.WriteFile(dst, []byte("data"), 0o644); err != nil {
		t.Fatalf("seed pre-existing dst: %v", err)
	}

	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	plan := Plan{OutputDir: dstDir, Entries: []Entry{{Src: src, Dst: dst}}}
	if err := ExecutePlan(plan, Options{InputDir: srcDir, OutputDir: dstDir}, log); err != nil {
		t.Fatalf("ExecutePlan: %v", err)
	}

	out := buf.String()
	if !strings.Contains(out, "destination already exists") {
		t.Errorf("log missing the already-exists record:\n%s", out)
	}
	if !strings.Contains(out, "frame.fit") {
		t.Errorf("already-exists record should name the file:\n%s", out)
	}
}
