// report.go writes the two shareable report files. Both land in the current
// working directory — the folder the user ran the command from — so they're
// easy to find and attach to a bug report without hunting through the cache.
package logger

import (
	"fmt"
	"os"
	"path/filepath"
)

// errorReportName is the automatic on-error copy: the failed run's full log
// section, dropped where the user ran the command.
const errorReportName = "sortronomy-error.log"

// reportFileName is the on-demand export written by --report: the entire
// (masked, rotation-capped) log, usable after failed and successful runs
// alike.
const reportFileName = "sortronomy-report.log"

// writeEntireLog copies the entire log at logPath into the current working
// directory with the given destination filename and returns the absolute path
// written. It only reads the log — it never opens it for append or rotates it.
func writeEntireLog(logPath, destName string) (string, error) {
	data, err := os.ReadFile(logPath)
	if err != nil {
		return "", fmt.Errorf("read log: %w", err)
	}
	return writeToCwd(destName, data)
}

// WriteErrorReport copies the entire log at logPath into "sortronomy-error.log"
// in the current working directory, so a user who hits an error finds the
// complete log right where they ran the command. It returns the absolute path
// written.
//
// Best-effort: callers should treat any error as "skip it and fall back to
// pointing at the cache log" (e.g. the working directory may be read-only).
func WriteErrorReport(logPath string) (string, error) {
	return writeEntireLog(logPath, errorReportName)
}

// WriteRunReport copies the entire log at logPath into "sortronomy-report.log"
// in the current working directory and returns the absolute path written. It
// only reads the log — it never opens it for append or rotates it — so it is
// safe to run at any time, after failed and successful runs alike. The rotated
// ".1" backup is deliberately not stitched in: the active log already holds up
// to maxLogBytes of history.
func WriteRunReport(logPath string) (string, error) {
	return writeEntireLog(logPath, reportFileName)
}

// writeToCwd writes data to name in the current working directory and returns
// the absolute path written.
func writeToCwd(name string, data []byte) (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("resolve working directory: %w", err)
	}
	dest := filepath.Join(cwd, name)
	if err := os.WriteFile(dest, data, 0o644); err != nil {
		return "", fmt.Errorf("write report: %w", err)
	}
	return dest, nil
}
