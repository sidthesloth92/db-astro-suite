// Package scan walks a directory tree for FITS files and reads their headers
// concurrently with a bounded worker pool. It reads headers only (never pixel
// data) and never panics on a bad file — unreadable files become Skipped
// entries and the scan continues.
package scan

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

// Frame is a single parsed FITS file: its path, size, and header metadata.
type Frame struct {
	Path string
	Size int64
	Meta astrofits.Metadata
}

// Skipped records a file that could not be parsed, with a human reason.
type Skipped struct {
	Path   string
	Reason string
}

// Result is the outcome of a scan.
type Result struct {
	Frames  []Frame
	Skipped []Skipped
	Total   int
}

// MetadataReader reads FITS header metadata from a path. Declared at the
// consumer side so scans can run against a fake reader in tests.
type MetadataReader func(path string) (astrofits.Metadata, error)

// Cache lets a scan reuse previously parsed metadata keyed by path+size+mtime.
// Implemented by internal/cache; a no-op implementation disables caching.
type Cache interface {
	// Get returns cached metadata when the file at path is unchanged.
	Get(path string, size int64, mtime time.Time) (astrofits.Metadata, bool)
	// Put records freshly parsed metadata for the file at path.
	Put(path string, size int64, mtime time.Time, meta astrofits.Metadata)
}

// Options configures a scan.
type Options struct {
	Root       string
	Reader     MetadataReader
	Cache      Cache
	Workers    int                   // defaults to runtime.NumCPU()
	OnProgress func(done, total int) // optional; called as files complete
	Log        *slog.Logger          // optional; nil discards every record
}

type job struct {
	path string
}

type outcome struct {
	frame   Frame
	skipped Skipped
	ok      bool
	cached  bool
}

// Scan walks opts.Root, reads every FITS header (via the worker pool), and
// returns the frames plus a list of skipped files. The context cancels the
// walk early.
func Scan(ctx context.Context, opts Options) (Result, error) {
	if opts.Reader == nil {
		return Result{}, errors.New("scan: nil MetadataReader")
	}
	log := opts.Log
	if log == nil {
		log = slog.New(slog.DiscardHandler)
	}
	workers := opts.Workers
	if workers < 1 {
		workers = runtime.NumCPU()
	}

	start := time.Now()
	paths, err := walkFITS(opts.Root, log)
	if err != nil {
		return Result{}, err
	}
	log.Info("scan start", "root", opts.Root, "workers", workers, "files", len(paths))

	jobs := make(chan job)
	outcomes := make(chan outcome)
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				outcomes <- process(j.path, opts.Reader, opts.Cache)
			}
		}()
	}

	go func() {
		defer close(jobs)
		for _, p := range paths {
			select {
			case <-ctx.Done():
				return
			case jobs <- job{path: p}:
			}
		}
	}()

	go func() {
		wg.Wait()
		close(outcomes)
	}()

	res := Result{Total: len(paths)}
	done := 0
	cacheHits := 0
	for o := range outcomes {
		done++
		if o.cached {
			cacheHits++
		}
		if o.ok {
			res.Frames = append(res.Frames, o.frame)
		} else {
			res.Skipped = append(res.Skipped, o.skipped)
			log.Warn("skipped: unreadable file", "file", o.skipped.Path, "reason", o.skipped.Reason)
		}
		if opts.OnProgress != nil {
			opts.OnProgress(done, len(paths))
		}
	}

	// Logged before the cancellation check so an interrupted run still records
	// how far it got.
	log.Info("scan complete",
		"total", res.Total,
		"parsed", len(res.Frames),
		"skipped", len(res.Skipped),
		"cacheHits", cacheHits,
		"elapsed", time.Since(start).Round(time.Millisecond).String())

	if err := ctx.Err(); err != nil {
		return res, err
	}
	return res, nil
}

// process stats a file, consults the cache, and parses on a miss. Parsing is
// wrapped so even a panicking reader becomes a Skipped entry.
func process(path string, reader MetadataReader, cache Cache) outcome {
	info, err := os.Stat(path)
	if err != nil {
		return outcome{skipped: Skipped{Path: path, Reason: err.Error()}}
	}
	size, mtime := info.Size(), info.ModTime()

	if cache != nil {
		if meta, ok := cache.Get(path, size, mtime); ok {
			return outcome{frame: Frame{Path: path, Size: size, Meta: meta}, ok: true, cached: true}
		}
	}

	meta, err := safeRead(reader, path)
	if err != nil {
		return outcome{skipped: Skipped{Path: path, Reason: err.Error()}}
	}
	if cache != nil {
		cache.Put(path, size, mtime, meta)
	}
	return outcome{frame: Frame{Path: path, Size: size, Meta: meta}, ok: true}
}

// safeRead converts a panic in the reader into an error (defense in depth).
func safeRead(reader MetadataReader, path string) (meta astrofits.Metadata, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%s: reader panicked: %v", filepath.Base(path), r)
		}
	}()
	return reader(path)
}

// walkFITS returns every FITS file under root (recursive, dotfiles excluded).
// Unreadable subtrees are logged and skipped rather than aborting the walk.
func walkFITS(root string, log *slog.Logger) ([]string, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", root)
	}
	var paths []string
	err = filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			// Skip unreadable subtrees rather than aborting the whole walk.
			if d != nil && d.IsDir() {
				log.Warn("unreadable directory skipped", "dir", p, "err", err)
				return filepath.SkipDir
			}
			log.Warn("unreadable entry skipped", "path", p, "err", err)
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if astrofits.IsFITS(p) {
			paths = append(paths, p)
		}
		return nil
	})
	return paths, err
}
