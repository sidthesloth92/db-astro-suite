package logger

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestOpenWritesToReturnedPath(t *testing.T) {
	dir := t.TempDir()
	sess, err := openIn(dir, "v1.2.3")
	if err != nil {
		t.Fatalf("openIn: %v", err)
	}
	sess.Logger.Info("hello", "file", "ngc7000.fit")
	if err := sess.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	if got := filepath.Dir(sess.Path); got != dir {
		t.Errorf("log path = %q, want it under %q", sess.Path, dir)
	}
	data, err := os.ReadFile(sess.Path)
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
		sess, err := openIn(dir, "v1")
		if err != nil {
			t.Fatalf("openIn: %v", err)
		}
		sess.Logger.Info(line)
		if err := sess.Close(); err != nil {
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


// TestOpenMasksHomePaths verifies the log file never carries the user's home
// directory — the property that makes it safe to attach to a public report.
func TestOpenMasksHomePaths(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skipf("no home dir available: %v", err)
	}

	sess, err := openIn(t.TempDir(), "v1")
	if err != nil {
		t.Fatalf("openIn: %v", err)
	}
	sess.Logger.Info("planned",
		"file", filepath.Join(home, "raw", "m31.fit"),
		"dst", "/Volumes/T7/out/m31.fit")
	if err := sess.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	data, err := os.ReadFile(sess.Path)
	if err != nil {
		t.Fatalf("read log: %v", err)
	}
	out := string(data)
	if strings.Contains(out, home) {
		t.Errorf("log leaks the home directory %q:\n%s", home, out)
	}
	sep := string(filepath.Separator)
	if !strings.Contains(out, "~"+sep+"raw"+sep+"m31.fit") {
		t.Errorf("log missing the masked path:\n%s", out)
	}
	if !strings.Contains(out, "/Volumes/T7/out/m31.fit") {
		t.Errorf("non-home path should be untouched:\n%s", out)
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

// TestDiscardSessionIsSafe verifies the discard session's zero-value contract:
// empty path (so report/footer callers no-op) and a safe Close.
func TestDiscardSessionIsSafe(t *testing.T) {
	sess := DiscardSession()
	sess.Logger.Error("boom")
	if sess.Path != "" {
		t.Errorf("discard session Path = %q, want empty", sess.Path)
	}
	if err := sess.Close(); err != nil {
		t.Errorf("Close on discard session: %v", err)
	}
}

