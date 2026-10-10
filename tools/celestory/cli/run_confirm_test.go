package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestConfirmDestructiveFrom pins the confirmation exit contract: -yes
// proceeds, an unattended run without -yes is a usage mistake (exit 2), and a
// decline — typed or EOF — cancels (exit 130).
func TestConfirmDestructiveFrom(t *testing.T) {
	tests := []struct {
		name        string
		stdin       string
		interactive bool
		assumeYes   bool
		wantErr     error // nil, errCancelled, or a *usageError sentinel check
		wantUsage   bool
	}{
		{name: "-yes skips the prompt", assumeYes: true, wantErr: nil},
		{name: "-yes wins even when non-interactive", assumeYes: true, interactive: false, wantErr: nil},
		{name: "non-interactive without -yes refuses as usage", interactive: false, wantUsage: true},
		{name: "typed y confirms", stdin: "y\n", interactive: true, wantErr: nil},
		{name: "typed yes confirms", stdin: "YES\n", interactive: true, wantErr: nil},
		{name: "typed n declines as cancelled", stdin: "n\n", interactive: true, wantErr: errCancelled},
		{name: "empty answer declines as cancelled", stdin: "\n", interactive: true, wantErr: errCancelled},
		{name: "EOF declines as cancelled", stdin: "", interactive: true, wantErr: errCancelled},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var out strings.Builder
			err := confirmDestructiveFrom(strings.NewReader(tc.stdin), &out, tc.interactive, "Wipe everything?", tc.assumeYes)

			if tc.wantUsage {
				var ue *usageError
				if !errors.As(err, &ue) {
					t.Fatalf("err = %v, want a *usageError", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("err = %v, want %v", err, tc.wantErr)
			}
			if tc.assumeYes && out.Len() != 0 {
				t.Errorf("-yes must not prompt, got: %s", out.String())
			}
		})
	}
}

// TestValidateInputDir pins the fix for bad -input paths being presented as
// crashes: a missing or non-directory input must fail (it becomes a usage
// error at the call site), a real folder must pass.
func TestValidateInputDir(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "not-a-dir.txt")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("seed file: %v", err)
	}

	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{name: "existing directory passes", path: dir, wantErr: false},
		{name: "missing path fails", path: filepath.Join(dir, "nope"), wantErr: true},
		{name: "file instead of directory fails", path: file, wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateInputDir(tc.path)
			if (err != nil) != tc.wantErr {
				t.Errorf("validateInputDir(%q) = %v, wantErr %v", tc.path, err, tc.wantErr)
			}
		})
	}
}

// TestShowConfigNamesTheLogWithoutCreatingIt pins two contract points: -config
// tells a tester where the debug log lives, and being a read-only info query
// it must never create the log file.
func TestShowConfigNamesTheLogWithoutCreatingIt(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)

	var out strings.Builder
	showConfig(&out, cliFlags{})

	if !strings.Contains(out.String(), "Log file:") {
		t.Errorf("-config output missing the log location:\n%s", out.String())
	}
	if !strings.Contains(out.String(), filepath.Join("celestory", "celestory.log")) {
		t.Errorf("-config output missing the celestory.log path:\n%s", out.String())
	}
	logPath := filepath.Join(home, "Library", "Caches", "celestory", "celestory.log")
	if _, err := os.Stat(logPath); err == nil {
		t.Error("-config must not create the log file")
	}
}
