//go:build !windows

package uninstall

import "os"

// selfDelete removes the executable at path. On Unix a running process may
// unlink its own executable — the inode stays alive until the process exits, so
// the removal is immediate and complete.
func selfDelete(path string) error {
	return os.Remove(path)
}
