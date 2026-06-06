package scan

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

func touch(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestScanReadsEveryFITSRecursively(t *testing.T) {
	dir := t.TempDir()
	touch(t, filepath.Join(dir, "a.fits"))
	touch(t, filepath.Join(dir, "b.fit"))
	touch(t, filepath.Join(dir, "notes.txt")) // ignored
	touch(t, filepath.Join(dir, "sub", "c.fits"))

	var calls int32
	reader := func(p string) (astrofits.Metadata, error) {
		atomic.AddInt32(&calls, 1)
		return astrofits.Metadata{FrameType: "Light", Target: filepath.Base(p)}, nil
	}

	res, err := Scan(context.Background(), Options{Root: dir, Reader: reader, Workers: 4})
	if err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if len(res.Frames) != 3 {
		t.Errorf("frames = %d, want 3 (.txt ignored)", len(res.Frames))
	}
	if res.Total != 3 {
		t.Errorf("total = %d, want 3", res.Total)
	}
	if atomic.LoadInt32(&calls) != 3 {
		t.Errorf("reader calls = %d, want 3", calls)
	}
}

func TestScanRecordsErrorsAndNeverPanics(t *testing.T) {
	dir := t.TempDir()
	touch(t, filepath.Join(dir, "good.fits"))
	touch(t, filepath.Join(dir, "bad.fits"))
	touch(t, filepath.Join(dir, "boom.fits"))

	reader := func(p string) (astrofits.Metadata, error) {
		switch filepath.Base(p) {
		case "bad.fits":
			return astrofits.Metadata{}, errors.New("unreadable")
		case "boom.fits":
			panic("simulated library panic")
		}
		return astrofits.Metadata{FrameType: "Light"}, nil
	}

	res, err := Scan(context.Background(), Options{Root: dir, Reader: reader, Workers: 3})
	if err != nil {
		t.Fatalf("Scan returned error: %v", err)
	}
	if len(res.Frames) != 1 {
		t.Errorf("frames = %d, want 1", len(res.Frames))
	}
	if len(res.Skipped) != 2 {
		t.Errorf("skipped = %d, want 2 (error + panic)", len(res.Skipped))
	}
}

type fakeCache struct {
	hits map[string]astrofits.Metadata
	puts int32
}

func (c *fakeCache) Get(path string, _ int64, _ time.Time) (astrofits.Metadata, bool) {
	m, ok := c.hits[path]
	return m, ok
}
func (c *fakeCache) Put(string, int64, time.Time, astrofits.Metadata) {
	atomic.AddInt32(&c.puts, 1)
}

func TestScanUsesCacheAndSkipsParseOnHit(t *testing.T) {
	dir := t.TempDir()
	hit := filepath.Join(dir, "cached.fits")
	miss := filepath.Join(dir, "fresh.fits")
	touch(t, hit)
	touch(t, miss)

	var parses int32
	reader := func(p string) (astrofits.Metadata, error) {
		atomic.AddInt32(&parses, 1)
		return astrofits.Metadata{FrameType: "Light", Target: "fresh"}, nil
	}
	c := &fakeCache{hits: map[string]astrofits.Metadata{hit: {FrameType: "Light", Target: "cached"}}}

	res, err := Scan(context.Background(), Options{Root: dir, Reader: reader, Cache: c, Workers: 2})
	if err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if len(res.Frames) != 2 {
		t.Fatalf("frames = %d, want 2", len(res.Frames))
	}
	if atomic.LoadInt32(&parses) != 1 {
		t.Errorf("parses = %d, want 1 (cache hit must skip parsing)", parses)
	}
	if atomic.LoadInt32(&c.puts) != 1 {
		t.Errorf("cache puts = %d, want 1 (only the miss is stored)", c.puts)
	}
}
