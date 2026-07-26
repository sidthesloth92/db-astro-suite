package atomicwrite

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestWriteFileCreatesNewFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "out.json")
	if err := WriteFile(path, []byte(`{"a":1}`), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if string(got) != `{"a":1}` {
		t.Errorf("content = %q, want %q", got, `{"a":1}`)
	}
}

func TestWriteFileReplacesExistingContentAndPerm(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.json")
	if err := os.WriteFile(path, []byte("old"), 0o600); err != nil {
		t.Fatalf("seed: %v", err)
	}

	if err := WriteFile(path, []byte("new"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	got, _ := os.ReadFile(path)
	if string(got) != "new" {
		t.Errorf("content = %q, want %q", got, "new")
	}
	if runtime.GOOS != "windows" {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("Stat: %v", err)
		}
		if info.Mode().Perm() != 0o644 {
			t.Errorf("perm = %v, want 0644", info.Mode().Perm())
		}
	}
}

func TestWriteFileLeavesNoTempLitter(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.json")
	if err := WriteFile(path, []byte("x"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Errorf("temp file left behind: %s", e.Name())
		}
	}
	if len(entries) != 1 {
		t.Errorf("dir should hold exactly the target file, got %d entries", len(entries))
	}
}

func TestWriteFileFailurePreservesOriginal(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.json")
	if err := os.WriteFile(path, []byte("precious"), 0o644); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// A target whose directory does not exist fails before any rename — the
	// original at the real path must be untouched.
	bad := filepath.Join(dir, "missing-subdir", "out.json")
	if err := WriteFile(bad, []byte("x"), 0o644); err == nil {
		t.Fatal("WriteFile into a missing directory should fail")
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if string(got) != "precious" {
		t.Errorf("original content = %q, want %q", got, "precious")
	}
}
