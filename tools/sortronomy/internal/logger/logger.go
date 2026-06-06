// Package logger provides sortronomy's durable, user-shareable debug log.
//
// It writes a human-readable log/slog text stream to a file in the user's cache
// directory so a user who hits an error can attach the log to a bug report.
// Nothing is uploaded — the file stays on the user's machine; sharing it is the
// user's choice.
package logger

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
)

// logFileName is the active log file. The single rollover backup gets a ".1"
// suffix.
const logFileName = "sortronomy.log"

// maxLogBytes is the size at which the active log is rotated to "<name>.1" on
// the next open, so the file can't grow without bound across many runs.
const maxLogBytes int64 = 1 << 20 // 1 MiB

// errorReportName is the on-error copy dropped into the working directory so a
// user finds the relevant log right where they ran the command.
const errorReportName = "sortronomy-error.log"

// errorReportLines is how many trailing log lines the on-error copy keeps. The
// failure context lives at the end of a run, so the tail is what matters; the
// full history stays in the cache log.
const errorReportLines = 50

// Open opens (creating if needed) the sortronomy log file under the user's cache
// directory and returns a text slog.Logger that writes to it, the absolute path
// of the file, and a close function the caller owns.
//
// Records append across runs; if the file already exceeds maxLogBytes it is
// first rotated to "<name>.1" so history stays bounded. level sets the minimum
// record level (Info by default; Debug adds per-file detail). The build version
// is attached to every record.
func Open(version string, level slog.Level) (*slog.Logger, string, func() error, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return nil, "", nil, err
	}
	return openIn(filepath.Join(base, "sortronomy"), version, level)
}

// Discard returns a logger that throws every record away. Used by callers that
// don't want a file (the dev inspect tool and tests).
func Discard() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// openIn is the directory-injected core of Open, kept separate so tests can
// target a temporary directory without touching the real cache dir.
func openIn(dir, version string, level slog.Level) (*slog.Logger, string, func() error, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, "", nil, err
	}
	path := filepath.Join(dir, logFileName)
	rotateIfLarge(path, maxLogBytes)

	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, "", nil, err
	}

	handler := slog.NewTextHandler(file, &slog.HandlerOptions{Level: level})
	log := slog.New(handler).With("version", version)
	return log, path, file.Close, nil
}

// rotateIfLarge renames path to path+".1" when it already exceeds max, keeping a
// single backup. Best-effort: any error leaves the existing file in place so
// logging still proceeds.
func rotateIfLarge(path string, max int64) {
	info, err := os.Stat(path)
	if err != nil || info.Size() < max {
		return
	}
	_ = os.Rename(path, path+".1")
}

// WriteErrorReport copies the last errorReportLines lines of the log at logPath
// into "sortronomy-error.log" in the current working directory, so a user who
// hits an error finds the relevant log right where they ran the command — no
// hunting through the cache directory. It returns the absolute path written.
//
// Best-effort: callers should treat any error as "skip it and fall back to
// pointing at the cache log" (e.g. the working directory may be read-only).
func WriteErrorReport(logPath string) (string, error) {
	tail, err := tailLines(logPath, errorReportLines)
	if err != nil {
		return "", err
	}
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dest := filepath.Join(cwd, errorReportName)
	if err := os.WriteFile(dest, []byte(tail), 0o644); err != nil {
		return "", err
	}
	return dest, nil
}

// tailLines returns the last n lines of the file at path (the whole file when it
// has fewer than n). The log is size-capped, so reading it whole is cheap.
func tailLines(path string, n int) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	lines := strings.Split(strings.TrimRight(string(data), "\n"), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return strings.Join(lines, "\n") + "\n", nil
}
