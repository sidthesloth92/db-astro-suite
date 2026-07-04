package main

import (
	"bytes"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/logger"
)

// TestWriteShareableReportExportsTheLog verifies writeShareableReport copies
// the whole log into sortronomy-report.log in the working directory and prints
// issue instructions with the issue URL.
func TestWriteShareableReportExportsTheLog(t *testing.T) {
	logPath := filepath.Join(t.TempDir(), "sortronomy.log")
	const content = "level=INFO msg=\"run start\"\nlevel=INFO msg=\"run end\" status=ok\n"
	if err := os.WriteFile(logPath, []byte(content), 0o644); err != nil {
		t.Fatalf("seed log: %v", err)
	}
	t.Chdir(t.TempDir())

	// Create a minimal session with the log path set.
	sess := &logger.Session{
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		Path:   logPath,
	}

	var out bytes.Buffer
	writeShareableReport(&out, sess)

	data, err := os.ReadFile("sortronomy-report.log")
	if err != nil {
		t.Fatalf("read exported report: %v", err)
	}
	if string(data) != content {
		t.Errorf("report = %q, want the whole log %q", data, content)
	}
	outStr := out.String()
	for _, want := range []string{"sortronomy-report.log", issueURL} {
		if !strings.Contains(outStr, want) {
			t.Errorf("output missing %q:\n%s", want, outStr)
		}
	}
}

// TestWriteShareableReportWithDiscardSession verifies that passing a discard
// session (Path == "") is a safe no-op.
func TestWriteShareableReportWithDiscardSession(t *testing.T) {
	t.Chdir(t.TempDir())

	sess := logger.DiscardSession()
	var out bytes.Buffer
	writeShareableReport(&out, sess)

	// No file written, no error printed.
	if out.Len() != 0 {
		t.Errorf("discard session should produce no output, got:\n%s", out.String())
	}
	if _, err := os.Stat("sortronomy-report.log"); err == nil {
		t.Error("no report file should be written for a discard session")
	}
}
