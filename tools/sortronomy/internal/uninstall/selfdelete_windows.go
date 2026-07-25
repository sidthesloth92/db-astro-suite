//go:build windows

package uninstall

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"syscall"
)

// detachedProcess starts the cleaner without a console window, independent of
// this process so it survives our exit.
const detachedProcess = 0x00000008 // DETACHED_PROCESS

// selfDelete removes the running executable on Windows. A running .exe cannot
// delete itself, so spawn a detached cmd.exe that waits ~2s for this process to
// exit, deletes the binary, then removes the (now-empty) install directory.
//
// The directory's entry in the user PATH is left as-is: once the directory is
// gone a stale PATH entry is simply ignored, so removing it adds risk (registry
// edits) for no user-visible benefit.
func selfDelete(path string) error {
	dir := filepath.Dir(path)
	// `ping -n 3 127.0.0.1` is a portable ~2s sleep available on every Windows.
	// rmdir (no /s) only removes the directory once it is empty; 2>nul swallows
	// the error if other files remain.
	script := fmt.Sprintf(`ping -n 3 127.0.0.1 >nul & del /f /q "%s" & rmdir "%s" 2>nul`, path, dir)
	cmd := exec.Command("cmd", "/C", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: detachedProcess}
	return cmd.Start()
}
