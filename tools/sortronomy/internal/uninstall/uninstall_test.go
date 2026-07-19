//go:build !windows

package uninstall

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// On Unix the removal is synchronous, so we can assert the binary is gone right
// after remove returns.
func TestRemoveDeletesBinaryAndKeepsSettings(t *testing.T) {
	bin := filepath.Join(t.TempDir(), "sortronomy")
	if err := os.WriteFile(bin, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}

	var out, errOut bytes.Buffer
	if code := remove(bin, &out, &errOut); code != 0 {
		t.Fatalf("exit code = %d, want 0 (stderr: %q)", code, errOut.String())
	}
	if _, err := os.Stat(bin); !os.IsNotExist(err) {
		t.Errorf("binary still present after uninstall: err=%v", err)
	}
	if !strings.Contains(out.String(), bin) {
		t.Errorf("output did not name the removed binary: %q", out.String())
	}
	if !strings.Contains(out.String(), "left in place") {
		t.Errorf("output should say settings were kept: %q", out.String())
	}
}

func TestRemoveMissingBinaryReportsError(t *testing.T) {
	var out, errOut bytes.Buffer
	code := remove(filepath.Join(t.TempDir(), "absent"), &out, &errOut)
	if code == 0 {
		t.Fatal("expected a non-zero exit code when the binary is missing")
	}
	if !strings.Contains(errOut.String(), "could not remove") {
		t.Errorf("stderr missing the failure message: %q", errOut.String())
	}
}
