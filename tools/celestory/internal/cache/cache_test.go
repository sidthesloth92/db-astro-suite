package cache

import (
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

func TestCacheReusesUnchangedAndReparsesChanged(t *testing.T) {
	dir := t.TempDir()
	c, err := Open(dir, dir, false)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}

	mtime := time.Unix(1_700_000_000, 0)
	meta := astrofits.Metadata{Target: "M31", FrameType: "Light", Exposure: 300}
	c.Put("/x/a.fits", 100, mtime, meta)

	got, ok := c.Get("/x/a.fits", 100, mtime)
	if !ok || got.Target != "M31" {
		t.Fatalf("unchanged file should hit cache; got %+v ok=%v", got, ok)
	}
	if _, ok := c.Get("/x/a.fits", 101, mtime); ok {
		t.Error("changed size should miss")
	}
	if _, ok := c.Get("/x/a.fits", 100, mtime.Add(time.Second)); ok {
		t.Error("changed mtime should miss")
	}
	if _, ok := c.Get("/x/never.fits", 1, mtime); ok {
		t.Error("unknown path should miss")
	}
}

func TestCachePersistsAcrossOpen(t *testing.T) {
	dir := t.TempDir()
	mtime := time.Unix(1_700_000_000, 0)

	c1, err := Open(dir, "/some/root", false)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	c1.Put("/some/root/a.fits", 42, mtime, astrofits.Metadata{Target: "M42", Exposure: 120})
	if err := c1.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	c2, err := Open(dir, "/some/root", false)
	if err != nil {
		t.Fatalf("re-Open: %v", err)
	}
	got, ok := c2.Get("/some/root/a.fits", 42, mtime)
	if !ok || got.Exposure != 120 {
		t.Fatalf("entry should persist across Open; got %+v ok=%v", got, ok)
	}
}

func TestCacheSavePrunesUnseenEntries(t *testing.T) {
	dir := t.TempDir()
	mtime := time.Unix(1_700_000_000, 0)

	c1, _ := Open(dir, "/r", false)
	c1.Put("/r/keep.fits", 1, mtime, astrofits.Metadata{Target: "Keep"})
	c1.Put("/r/drop.fits", 2, mtime, astrofits.Metadata{Target: "Drop"})
	_ = c1.Save()

	// Re-open; only touch keep.fits, then save → drop.fits should be pruned.
	c2, _ := Open(dir, "/r", false)
	if _, ok := c2.Get("/r/keep.fits", 1, mtime); !ok {
		t.Fatal("keep.fits should be present")
	}
	_ = c2.Save()

	c3, _ := Open(dir, "/r", false)
	if _, ok := c3.Get("/r/drop.fits", 2, mtime); ok {
		t.Error("drop.fits should have been pruned (not seen last run)")
	}
	if _, ok := c3.Get("/r/keep.fits", 1, mtime); !ok {
		t.Error("keep.fits should have survived pruning")
	}
}
