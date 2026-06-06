package logger

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestOpenWritesToReturnedPath(t *testing.T) {
	dir := t.TempDir()
	log, path, closeLog, err := openIn(dir, "v1.2.3", slog.LevelInfo)
	if err != nil {
		t.Fatalf("openIn: %v", err)
	}
	log.Info("hello", "file", "ngc7000.fit")
	if err := closeLog(); err != nil {
		t.Fatalf("close: %v", err)
	}

	if got := filepath.Dir(path); got != dir {
		t.Errorf("log path = %q, want it under %q", path, dir)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read log: %v", err)
	}
	out := string(data)
	for _, want := range []string{"hello", "file=ngc7000.fit", "version=v1.2.3"} {
		if !strings.Contains(out, want) {
			t.Errorf("log missing %q in:\n%s", want, out)
		}
	}
}

func TestOpenAppendsAcrossRuns(t *testing.T) {
	dir := t.TempDir()
	for _, line := range []string{"first run", "second run"} {
		log, _, closeLog, err := openIn(dir, "v1", slog.LevelInfo)
		if err != nil {
			t.Fatalf("openIn: %v", err)
		}
		log.Info(line)
		if err := closeLog(); err != nil {
			t.Fatalf("close: %v", err)
		}
	}
	data, err := os.ReadFile(filepath.Join(dir, logFileName))
	if err != nil {
		t.Fatalf("read log: %v", err)
	}
	out := string(data)
	if !strings.Contains(out, "first run") || !strings.Contains(out, "second run") {
		t.Errorf("expected both runs appended, got:\n%s", out)
	}
}

func TestRotateIfLarge(t *testing.T) {
	tests := []struct {
		name       string
		size       int64
		max        int64
		wantBackup bool
	}{
		{name: "under cap stays", size: 10, max: 1024, wantBackup: false},
		{name: "over cap rotates", size: 2048, max: 1024, wantBackup: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			path := filepath.Join(dir, logFileName)
			if err := os.WriteFile(path, make([]byte, tc.size), 0o644); err != nil {
				t.Fatalf("seed log: %v", err)
			}
			rotateIfLarge(path, tc.max)

			_, err := os.Stat(path + ".1")
			gotBackup := err == nil
			if gotBackup != tc.wantBackup {
				t.Errorf("backup exists = %v, want %v", gotBackup, tc.wantBackup)
			}
		})
	}
}

func TestDiscardIsNoOp(t *testing.T) {
	// Should not panic and should write nowhere observable.
	Discard().Error("boom", "file", "x.fit")
}

func TestTailLines(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "in.log")
	if err := os.WriteFile(path, []byte("l1\nl2\nl3\nl4\nl5\n"), 0o644); err != nil {
		t.Fatalf("seed: %v", err)
	}
	tests := []struct {
		name string
		n    int
		want string
	}{
		{name: "fewer than n returns all", n: 10, want: "l1\nl2\nl3\nl4\nl5\n"},
		{name: "more than n returns tail", n: 2, want: "l4\nl5\n"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := tailLines(path, tc.n)
			if err != nil {
				t.Fatalf("tailLines: %v", err)
			}
			if got != tc.want {
				t.Errorf("tailLines(%d) = %q, want %q", tc.n, got, tc.want)
			}
		})
	}
}

func TestWriteErrorReportDropsTailInCwd(t *testing.T) {
	logDir := t.TempDir()
	logPath := filepath.Join(logDir, logFileName)
	var b strings.Builder
	for i := 0; i < errorReportLines+20; i++ {
		fmt.Fprintf(&b, "line %d\n", i)
	}
	if err := os.WriteFile(logPath, []byte(b.String()), 0o644); err != nil {
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
	gotLines := strings.Count(string(data), "\n")
	if gotLines != errorReportLines {
		t.Errorf("report has %d lines, want %d", gotLines, errorReportLines)
	}
	// The tail must include the last log line and exclude the very first.
	if !strings.Contains(string(data), "line 69") {
		t.Errorf("report missing last line:\n%s", data)
	}
	if strings.Contains(string(data), "line 0\n") {
		t.Errorf("report should not contain the earliest line:\n%s", data)
	}
}
