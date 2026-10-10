// Package logger provides celestory's durable, user-shareable debug log.
//
// It writes a human-readable log/slog text stream to a file in the user's cache
// directory so a user who hits an error — or a run whose output just looks
// wrong — can attach the log to a bug report. Home-directory paths are masked
// to "~" in every record, so the file never carries the user's username or
// home folder layout. Nothing is uploaded — the file stays on the user's
// machine; sharing it is the user's choice.
//
// The log lives in the same directory as the per-root scan caches
// (os.UserCacheDir()/celestory) but is never purged by -reset — cache.Purge
// only removes *.json files — so the reset itself stays debuggable. The
// location deliberately ignores the config's CacheDir override: the log must
// open before the config is trusted, and relocating the scan cache should not
// move the debug log.
package logger

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/sidthesloth92/db-astro-suite/libs/redact"
)

// logFileName is the active log file. The single rollover backup gets a ".1"
// suffix.
const logFileName = "celestory.log"

// maxLogBytes is the size at which the active log is rotated to "<name>.1" on
// the next open, so the file can't grow without bound across many runs. 5 MiB
// absorbs the per-frame INFO detail of many large scans while keeping the
// -report export comfortably attachable to a GitHub issue.
const maxLogBytes int64 = 5 << 20 // 5 MiB

// Session is one process's handle on the shared cache log: the logger to
// write with, and the file records land in.
type Session struct {
	// Logger writes text records to the log file (or nowhere, for a discard
	// session). Home-directory paths in messages and attribute values are
	// masked to "~".
	Logger *slog.Logger
	// Path is the absolute log file path. Empty for a discard session, which
	// report writers and footer printers treat as "no log to point at".
	Path string

	closeFn func() error
}

// Close releases the underlying log file. Safe on a discard session.
func (s *Session) Close() error {
	if s.closeFn == nil {
		return nil
	}
	return s.closeFn()
}

// Open opens (creating if needed) the celestory log file under the user's
// cache directory and returns the session handle for it.
//
// Records append across runs; if the file already exceeds maxLogBytes it is
// first rotated to "<name>.1" so history stays bounded. Logging is always at
// Info level. The build version is attached to every record.
func Open(version string) (*Session, error) {
	dir, err := defaultLogDir()
	if err != nil {
		return nil, err
	}
	return openIn(dir, version)
}

// DiscardSession returns a Session whose logger drops every record, used when
// the log file cannot be opened. Path is empty so report and footer callers
// no-op.
func DiscardSession() *Session {
	return &Session{Logger: Discard()}
}

// Discard returns a logger that throws every record away. Used by callers that
// don't want a file (tests).
func Discard() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// DefaultLogPath returns the cache log path without opening or rotating the
// file. Used by -config, which reports where the log lives without touching it.
func DefaultLogPath() (string, error) {
	dir, err := defaultLogDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, logFileName), nil
}

// defaultLogDir resolves the celestory cache directory, shared by Open and
// DefaultLogPath so the two can't drift.
func defaultLogDir() (string, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return "", fmt.Errorf("resolve cache dir: %w", err)
	}
	return filepath.Join(base, "celestory"), nil
}

// openIn is the directory-injected core of Open, kept separate so tests can
// target a temporary directory without touching the real cache dir.
func openIn(dir, version string) (*Session, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create log dir: %w", err)
	}
	path := filepath.Join(dir, logFileName)
	rotateIfLarge(path, maxLogBytes)

	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open log file: %w", err)
	}

	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	// Mask the user's home directory out of every record so the log is safe
	// to attach to a public bug report. Best-effort: with no resolvable home
	// directory the log is simply written unmasked.
	if masker, ok := redact.SystemMasker(); ok {
		opts.ReplaceAttr = masker.ReplaceAttr
	}
	log := slog.New(slog.NewTextHandler(file, opts)).With("version", version)
	return &Session{Logger: log, Path: path, closeFn: file.Close}, nil
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
