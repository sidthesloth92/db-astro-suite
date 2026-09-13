package logger

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteErrorReport(t *testing.T) {
	const content = "log line one\nlog line two\n"
	logPath := filepath.Join(t.TempDir(), logFileName)
	if err := os.WriteFile(logPath, []byte(content), 0o644); err != nil {
		t.Fatalf("seed log: %v", err)
	}
	t.Chdir(t.TempDir()) // run "from" a clean working directory

	report, err := WriteErrorReport(logPath)
	if err != nil {
		t.Fatalf("WriteErrorReport: %v", err)
	}
	if filepath.Base(report) != errorReportName {
		t.Errorf("report name = %q, want %q", filepath.Base(report), errorReportName)
	}
	data, err := os.ReadFile(report)
	if err != nil {
		t.Fatalf("read report: %v", err)
	}
	if string(data) != content {
		t.Errorf("report = %q, want entire log %q", data, content)
	}
}

func TestWriteErrorReportMissingLog(t *testing.T) {
	t.Chdir(t.TempDir())
	if _, err := WriteErrorReport(filepath.Join(t.TempDir(), "absent.log")); err == nil {
		t.Fatal("expected an error for a missing log file, got nil")
	}
}

// TestWriteRunReportCopiesWholeLog runs two real logger sessions and verifies
// the --report export carries both runs byte-for-byte — the whole log, not a
// tail or a single run.
func TestWriteRunReportCopiesWholeLog(t *testing.T) {
	logDir := t.TempDir()
	for _, msg := range []string{"first run marker", "second run marker"} {
		sess, err := openIn(logDir, "v1")
		if err != nil {
			t.Fatalf("openIn: %v", err)
		}
		sess.Logger.Info(msg)
		if err := sess.Close(); err != nil {
			t.Fatalf("close: %v", err)
		}
	}
	logPath := filepath.Join(logDir, logFileName)
	logData, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("read log: %v", err)
	}

	t.Chdir(t.TempDir())

	report, err := WriteRunReport(logPath)
	if err != nil {
		t.Fatalf("WriteRunReport: %v", err)
	}
	if filepath.Base(report) != reportFileName {
		t.Errorf("report name = %q, want %q", filepath.Base(report), reportFileName)
	}
	reportData, err := os.ReadFile(report)
	if err != nil {
		t.Fatalf("read report: %v", err)
	}
	if string(reportData) != string(logData) {
		t.Errorf("report differs from log:\nreport:\n%s\nlog:\n%s", reportData, logData)
	}
	for _, want := range []string{"first run marker", "second run marker"} {
		if !strings.Contains(string(reportData), want) {
			t.Errorf("report missing %q", want)
		}
	}
}

func TestWriteRunReportMissingLog(t *testing.T) {
	t.Chdir(t.TempDir())
	if _, err := WriteRunReport(filepath.Join(t.TempDir(), "absent.log")); err == nil {
		t.Fatal("expected an error for a missing log file, got nil")
	}
}
