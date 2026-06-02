// Package fsutil holds small filesystem helpers reused across organize / flats.
package fsutil

import (
	"io"
	"os"
	"path/filepath"
)

// CopyFile copies src to dst, creating parent directories as needed.
// If dst already exists, the function returns nil without overwriting —
// Sortronomy's organize and rename flows treat re-runs as idempotent.
func CopyFile(src, dst string) error {
	if _, err := os.Stat(dst); err == nil {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	tmp, err := os.CreateTemp(filepath.Dir(dst), ".sortronomy-*.tmp")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	cleanup := func() { _ = os.Remove(tmpPath) }

	if _, err := io.Copy(tmp, in); err != nil {
		tmp.Close()
		cleanup()
		return err
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return err
	}

	// Preserve mtime / mode where possible.
	if info, err := os.Stat(src); err == nil {
		_ = os.Chmod(tmpPath, info.Mode())
		_ = os.Chtimes(tmpPath, info.ModTime(), info.ModTime())
	}

	if err := os.Rename(tmpPath, dst); err != nil {
		cleanup()
		return err
	}
	return nil
}
