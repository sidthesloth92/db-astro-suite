package main

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/logger"
)

// seededSession returns a Session backed by a real seeded log file so the
// report writers have something to copy, plus the log's content.
func seededSession(t *testing.T) (*logger.Session, string) {
	t.Helper()
	const content = "run start\nrun end\n"
	logPath := filepath.Join(t.TempDir(), "celestory.log")
	if err := os.WriteFile(logPath, []byte(content), 0o644); err != nil {
		t.Fatalf("seed log: %v", err)
	}
	return &logger.Session{Logger: logger.Discard(), Path: logPath}, content
}

// TestFinishRunMatrix pins the status × -report contract: which exit code
// comes back, which report file is (or is not) produced, and what the user is
// told. This is the behaviour testers rely on when we ask them for a report.
func TestFinishRunMatrix(t *testing.T) {
	tests := []struct {
		name          string
		runErr        error
		report        bool
		wantCode      int
		wantErrorLog  bool // celestory-error.log dropped in cwd
		wantReportLog bool // celestory-report.log dropped in cwd
		wantStdout    []string
		wantStderr    []string
	}{
		{
			name:       "ok without -report prints the footer only",
			runErr:     nil,
			wantCode:   0,
			wantStdout: []string{"celestory.log", "-report"},
		},
		{
			name:          "ok with -report exports the shareable report",
			runErr:        nil,
			report:        true,
			wantCode:      0,
			wantReportLog: true,
			wantStdout:    []string{"celestory-report.log", issueURL},
		},
		{
			name:       "cancelled prints Cancelled and writes nothing",
			runErr:     errCancelled,
			wantCode:   130,
			wantStdout: []string{"Cancelled."},
		},
		{
			name:          "cancelled with -report still exports the report",
			runErr:        context.Canceled,
			report:        true,
			wantCode:      130,
			wantReportLog: true,
			wantStdout:    []string{"Cancelled.", "celestory-report.log"},
		},
		{
			name:       "usage error writes no report",
			runErr:     &usageError{msg: "no folder given"},
			wantCode:   2,
			wantStderr: []string{"celestory: no folder given"},
		},
		{
			name:          "usage error with -report still exports the report",
			runErr:        &usageError{msg: "no folder given"},
			report:        true,
			wantCode:      2,
			wantReportLog: true,
			wantStderr:    []string{"celestory: no folder given", "celestory-report.log"},
		},
		{
			name:         "error without -report auto-writes celestory-error.log",
			runErr:       errors.New("boom"),
			wantCode:     1,
			wantErrorLog: true,
			wantStderr:   []string{"celestory: boom", "celestory-error.log", issueURL},
		},
		{
			name:          "error with -report suppresses the error log and writes the report instead",
			runErr:        errors.New("boom"),
			report:        true,
			wantCode:      1,
			wantErrorLog:  false,
			wantReportLog: true,
			wantStderr:    []string{"celestory: boom", "celestory-report.log"},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Chdir(t.TempDir())
			sess, _ := seededSession(t)
			var stdout, stderr strings.Builder

			code := finishRun(&stdout, &stderr, sess, tc.report, tc.runErr)

			if code != tc.wantCode {
				t.Errorf("exit code = %d, want %d", code, tc.wantCode)
			}
			assertFileExistence(t, "celestory-error.log", tc.wantErrorLog)
			assertFileExistence(t, "celestory-report.log", tc.wantReportLog)
			for _, want := range tc.wantStdout {
				if !strings.Contains(stdout.String(), want) {
					t.Errorf("stdout missing %q in:\n%s", want, stdout.String())
				}
			}
			for _, want := range tc.wantStderr {
				if !strings.Contains(stderr.String(), want) {
					t.Errorf("stderr missing %q in:\n%s", want, stderr.String())
				}
			}
		})
	}
}

// TestFinishRunWithDiscardSession verifies a failed run without a log file
// exits with the right code and produces no report files.
func TestFinishRunWithDiscardSession(t *testing.T) {
	t.Chdir(t.TempDir())
	var stdout, stderr strings.Builder

	code := finishRun(&stdout, &stderr, logger.DiscardSession(), false, errors.New("boom"))

	if code != 1 {
		t.Errorf("exit code = %d, want 1", code)
	}
	assertFileExistence(t, "celestory-error.log", false)
	assertFileExistence(t, "celestory-report.log", false)
}

func assertFileExistence(t *testing.T, name string, want bool) {
	t.Helper()
	_, err := os.Stat(name)
	got := err == nil
	if got != want {
		t.Errorf("%s exists = %v, want %v", name, got, want)
	}
}
