// Package atomicwrite replaces files via temp-file + rename so a crash or
// interrupt can never leave a truncated, corrupt file behind. A replaced file
// is a genuinely new file (fresh inode), so its creation time reflects the
// last generation — every Celestory on-disk store writes through this.
package atomicwrite

import (
	"fmt"
	"os"
	"path/filepath"
)

// WriteFile atomically replaces path with data: it writes to a temp file in
// the same directory (guaranteeing a same-filesystem rename), syncs it, then
// renames it over path. On any error the original file is left untouched and
// the temp file is removed.
func WriteFile(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, ".celestory-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp file in %s: %w", dir, err)
	}
	tmpPath := tmp.Name()
	// Until the rename succeeds, the temp file must never survive.
	defer os.Remove(tmpPath)

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("write temp file %s: %w", tmpPath, err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("sync temp file %s: %w", tmpPath, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp file %s: %w", tmpPath, err)
	}
	// CreateTemp opens 0600; apply the caller's intended permissions.
	if err := os.Chmod(tmpPath, perm); err != nil {
		return fmt.Errorf("chmod temp file %s: %w", tmpPath, err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("replace %s: %w", path, err)
	}
	return nil
}
