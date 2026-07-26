package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/logger"
)

func TestWriteShareableReportExportsTheLog(t *testing.T) {
	const content = "run start\nscan complete\nrun end\n"
	logPath := filepath.Join(t.TempDir(), "celestory.log")
	if err := os.WriteFile(logPath, []byte(content), 0o644); err != nil {
		t.Fatalf("seed log: %v", err)
	}
	t.Chdir(t.TempDir())

	var buf strings.Builder
	writeShareableReport(&buf, &logger.Session{Logger: logger.Discard(), Path: logPath})

	report := filepath.Join(mustGetwd(t), "celestory-report.log")
	data, err := os.ReadFile(report)
	if err != nil {
		t.Fatalf("expected the report file to exist: %v", err)
	}
	if string(data) != content {
		t.Errorf("report = %q, want entire log %q", data, content)
	}
	out := buf.String()
	for _, want := range []string{"celestory-report.log", issueURL} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q in:\n%s", want, out)
		}
	}
}

func TestWriteShareableReportWithDiscardSession(t *testing.T) {
	t.Chdir(t.TempDir())

	var buf strings.Builder
	writeShareableReport(&buf, logger.DiscardSession())

	if buf.Len() != 0 {
		t.Errorf("expected no output for a discard session, got:\n%s", buf.String())
	}
	if _, err := os.Stat(filepath.Join(mustGetwd(t), "celestory-report.log")); err == nil {
		t.Error("expected no report file for a discard session")
	}
}

func mustGetwd(t *testing.T) string {
	t.Helper()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	return cwd
}
