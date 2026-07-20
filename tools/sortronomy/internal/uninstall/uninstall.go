// Package uninstall implements `sortronomy --uninstall`: it removes the
// currently-running sortronomy binary from disk. Saved settings and the debug
// log are intentionally left in place — they are tiny, and keeping them means a
// later reinstall retains the user's grouping defaults and filter presets.
package uninstall

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// Run removes the running sortronomy executable and returns a process exit code
// (0 on success, 1 on failure). Configuration and cache are not touched.
func Run(stdout, stderr io.Writer) int {
	exe, err := os.Executable()
	if err != nil {
		fmt.Fprintf(stderr, "sortronomy: could not locate the running binary: %v\n", err)
		return 1
	}
	// Resolve symlinks so the real file is removed, not a link to it.
	if resolved, rerr := filepath.EvalSymlinks(exe); rerr == nil {
		exe = resolved
	}
	return remove(exe, stdout, stderr)
}

// remove deletes the binary at path and reports the outcome. It is separated
// from Run so it can be tested without depending on os.Executable().
func remove(path string, stdout, stderr io.Writer) int {
	fmt.Fprintf(stdout, "Uninstalling sortronomy (%s)...\n", path)
	if err := selfDelete(path); err != nil {
		fmt.Fprintf(stderr, "sortronomy: could not remove %s: %v\n", path, err)
		fmt.Fprintln(stderr, "If it needs elevated permissions, delete that file manually.")
		return 1
	}
	fmt.Fprintln(stdout, "Done. Your saved settings and log were left in place.")
	return 0
}
