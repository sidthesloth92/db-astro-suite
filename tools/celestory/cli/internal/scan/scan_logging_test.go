package scan

import (
	"context"
	"errors"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

// syncWriter serialises writes from the scan's worker goroutines so the log
// buffer is race-free under -race.
type syncWriter struct {
	mu  sync.Mutex
	buf strings.Builder
}

func (w *syncWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.buf.Write(p)
}

func (w *syncWriter) String() string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.buf.String()
}

func TestScanLogsSkipsAndCompletion(t *testing.T) {
	dir := t.TempDir()
	touch(t, filepath.Join(dir, "good.fits"))
	touch(t, filepath.Join(dir, "corrupt.fits"))

	reader := func(p string) (astrofits.Metadata, error) {
		if filepath.Base(p) == "corrupt.fits" {
			return astrofits.Metadata{}, errors.New("not a FITS header")
		}
		return astrofits.Metadata{FrameType: "Light", Target: "M31"}, nil
	}

	var w syncWriter
	res, err := Scan(context.Background(), Options{
		Root:    dir,
		Reader:  reader,
		Workers: 2,
		Log:     slog.New(slog.NewTextHandler(&w, nil)),
	})
	if err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if len(res.Skipped) != 1 {
		t.Fatalf("skipped = %d, want 1", len(res.Skipped))
	}

	out := w.String()
	for _, want := range []string{
		"scan start",
		"files=2",
		"skipped: unreadable file",
		"corrupt.fits",
		"not a FITS header",
		"scan complete",
		"total=2",
		"parsed=1",
		"skipped=1",
		"cacheHits=0",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("log missing %q in:\n%s", want, out)
		}
	}
}

func TestScanWithNilLogDoesNotPanic(t *testing.T) {
	dir := t.TempDir()
	touch(t, filepath.Join(dir, "a.fits"))

	reader := func(p string) (astrofits.Metadata, error) {
		return astrofits.Metadata{FrameType: "Light"}, nil
	}
	if _, err := Scan(context.Background(), Options{Root: dir, Reader: reader}); err != nil {
		t.Fatalf("Scan with nil Log: %v", err)
	}
}
