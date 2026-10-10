package main

import (
	"errors"
	"io/fs"
	"os"
)

// osProbe is the os.Stat-backed library.DiskProbe used for real runs.
type osProbe struct{}

// RootReachable reports whether root exists and is a directory (its disk is
// mounted and the folder is present).
func (osProbe) RootReachable(root string) bool {
	info, err := os.Stat(root)
	return err == nil && info.IsDir()
}

// FileExists reports whether the file at path definitively exists. Any error
// other than a certain not-exist (permissions, I/O) reports true, so the index
// heal never drops an entry it could not actually verify.
func (osProbe) FileExists(path string) bool {
	if _, err := os.Stat(path); errors.Is(err, fs.ErrNotExist) {
		return false
	}
	return true
}
